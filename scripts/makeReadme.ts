#!/usr/bin/env node

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getMatch, isDefined, isEmpty, isNonEmpty, mapNonEmpty, rm_rf, trim } from '@carlwr/typescript-extra';
import { Application, type TypeDocOptions } from 'typedoc';
import type { PluginOptions } from 'typedoc-plugin-markdown';
import preamble from './readmePreamble.js';

/* hacky, temporary implementation for creating the API section of the readme:
- use TypeDoc with the markdown plugin to generate markdown files
- parse and process the markdown files
*/

const TO        = 'README.md'
const SRC_INDEX = 'src/index.ts'
const TEMPDIR   = '.aux/makeReadme'

type ExtendedTypeDocOptions = TypeDocOptions & PluginOptions;

const pluginOptions: ExtendedTypeDocOptions = {
  plugin: ['typedoc-plugin-markdown'],
  entryPoints: [SRC_INDEX],
  out: TEMPDIR,
  readme: 'none',
  excludeExternals: true,
  skipErrorChecking: false,
  cleanOutputDir: true,
  expandParameters: true,
  useCodeBlocks: true,
  hidePageHeader: true,
  hideBreadcrumbs: true,
  hidePageTitle: true,
  blockTagsPreserveOrder: ['@example'],
  parametersFormat: 'table',
  interfacePropertiesFormat: 'table',
  disableSources: true,
  validation: {
    invalidLink: false,
    notExported: false,
    rewrittenLink: false,
  },
};

// convention: all multi-line strings are _trimmed_ - no trailing newlines

interface Doc {
  path    : string
  contents: string
}

type Hashes = '#'|'##'|'###'|'####'

type Heading = undefined|[Hashes,string]

interface Section {
  heading : Heading
  block   : undefined|string
  contents: string
}

function toHashes(hashes: string): Hashes {
  const match = hashes.match(/^#{1,4}$/)
  if (!match) throw new Error(`Invalid hashes: ${hashes}`)
  return match[0] as Hashes
}

function parseDoc(doc: Doc): [Section,...Section[]] {

  const docContents = doc.contents
    .replace(/^#+\s+example.*/gmi, 'example:')
    .replace(/\[(.*?)\]\(.*?\)/g, '`$1`')

  const parts = docContents.split(/^(?=#+\s+.+)/m)
  if (!isNonEmpty(parts)) throw new Error(`No parts in ${doc.path}`)

  const partsTrimmed = mapNonEmpty(parts,trim)

  const sections = mapNonEmpty(partsTrimmed,p => {

    const [,hash,head,r]=p    .match(/^(?:(#+)\s+([^\n]+)\n)?\s*(.*)/s)||[]
    const [,blck,cont  ]=r   ?.match(/^(?:```\w+\n(.*?)\n```(?:$|\n))?(.*)/s)||[]
    const [,block      ]=blck?.match(/^\s*(.*?)[\s;]*$/ms             )||[]

    const heading: Heading =
      (hash && head)
      ? [toHashes(hash), head]
      : undefined

    const contents = (cont ?? '').trim()

    const section: Section = { heading, block, contents }
    return section
  })
  return sections
}

function maybeGetCallSigBlock(sec: Section): string|undefined {
  const isCallSig = /^call signature/i.test(sec.heading?.[1] ?? '')
  return isCallSig ? sec.block  : undefined
}

function sections2block(secs: [Section, ...Section[]]): string {
  const [sec0,..._] = secs
  let block: string

  if (sec0.heading===undefined) {
    if (sec0.block===undefined)
      throw new Error('heading-less first section, yet block undefined')
    block = sec0.block
  } else {
    const block_callSigs = secs.map(maybeGetCallSigBlock).filter(isDefined)
    if (isEmpty(block_callSigs))
      throw new Error('no heading-less first section, and no callSig blocks')
    block = block_callSigs.join('\n\n')
  }

  if (!block.match(/^./s)) throw new Error(`Invalid block: '${block}'`)
  return block
}

function renderSections(secs: [Section, ...Section[]]): string {
  const block = sections2block(secs)
  const contents = secs[0].contents
  return ['```ts', block, '```', contents].join('\n')
}

async function readDoc(path: string): Promise<Doc> {
  if (!path.endsWith('.md')) {
    throw new Error(`Invalid file name: ${path}`);
  }
  const contents = await readFile(path, 'utf-8')
  return { path, contents }
}

async function readDocs(dir: string): Promise<Doc[]> {
  let filenames: string[]
  try {
    filenames = await readdir(dir)
  } catch {
    throw new Error(`Failed to read directory: ${dir}`);
  }
  const paths = filenames.sort().map(f => join(dir, f))
  return await Promise.all(paths.map(readDoc))
}

async function mkReadme(): Promise<void> {

  const app = await Application.bootstrapWithPlugins(pluginOptions);

  const project = await app.convert();
  if (!project) throw new Error('Failed to convert project');

  await app.generateOutputs(project);
  await rm_rf(join(TEMPDIR, 'README.md' ))
  await rm_rf(join(TEMPDIR, 'interfaces'))
  console.log(`files generated into ${TEMPDIR}.`);

  const allDocs  = await readDocs(join(TEMPDIR, 'functions'))
  const docs     = allDocs.filter(doc => !doc.path.endsWith('_.md'))

  const renderedDocs = docs.map(doc => {
    const funcName = getMatch(/[^/]+(?=\.md)/, doc.path)
    let rendered: string
    try {
      rendered = renderSections(parseDoc(doc))
    } catch (e) {
      console.error(`Failed to render ${doc.path}:`)
      throw e
    }
    return `### \`${funcName}\`\n\n${rendered}`
  }).join('\n\n')

  const readme = `${preamble}\n\n${renderedDocs}`

  // print what the current dir is:
  console.log(`current dir: ${process.cwd()}`)

  await writeFile(TO, readme, 'utf-8');
  console.log(`${TO} generated successfully.`);
}

mkReadme().catch(console.error);
