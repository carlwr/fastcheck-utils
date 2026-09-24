import * as pkg from "./pkgJson.js";

const preamble =  `
# ${pkg.name}

_utilities and improved generators for [fast-check](https://github.com/dubzzz/fast-check)_

Links:
* github: ${linkify(pkg.repoUrl)}
* npm: ${linkify(pkg.npmUrl)}

## Installation

\`\`\`bash
npm install ${pkg.pkgJson.name}
\`\`\`

\`fast-check\` is a peer dependency of this package. It should be picked up by the package manager also if you depend on e.g. \`@fast-check/vitest\` or \`@fast-check/jest\` rather than on \`fast-check\` directly.

## Authoring

This \`README.md\` file, and any _JSDoc_ documentation, is written entirely by me, Carl, a human developer. [Agents are not allowed][AGENTS.md] to touch the prose of these.

I-the-human implemented everything up to and including _v0.5.2_. For later versions, agentic tools may be used as a development tool; with myself as the reviewer and ultimate decision-maker. I am and will remain the sole author of this \`README.md\` file and any _JSDoc_.

[AGENTS.md]: ./AGENTS.md

---

## Utilities and generators
`

export default preamble

// to md link; link text: remove https?://
function linkify(url: string): string {
  const linkText = url.replace(/^https?:\/\//, '')
  return `[${linkText}](${url})`
}
