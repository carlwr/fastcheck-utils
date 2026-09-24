import { andThen } from '@carlwr/typescript-extra/maybe-async'
import { it as fcIt } from '@fast-check/vitest'
import * as fc from 'fast-check'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as fcu from '../src/index.js'


type Mode = 'sync'|'async'
type Entrypoint = 'assert'|'check'
type Plugin = fc.Plugin<unknown>
type Reqs = Record<string, number>

type Predicate  = Parameters<typeof fc.property     <[null]>>[1]
type PPredicate = Parameters<typeof fc.asyncProperty<[null]>>[1]

const unit = fc.constant(null)
const ok = () => true
const prop      = (p: Predicate ) => fc.property     (unit, p)
const asyncProp = (p: PPredicate) => fc.asyncProperty(unit, p)

const assertProp = (p: Predicate, ...plugins: Plugin[]) =>
  fc.assert(prop(p), {plugins})
const assertAsync = (p: PPredicate, ...plugins: Plugin[]) =>
  fc.assert(asyncProp(p), {plugins})

function run<Ts>(
  entrypoint: Entrypoint,
  property  : fc.IRawProperty<Ts>,
  params    : fc.Parameters<Ts>,
): unknown {
  if (entrypoint === 'assert')
    return fc.assert(property, params)
  /* fc.check reports a property failure in its result rather than throwing */
  return andThen(fc.check(property, params), ({failed}) => {
    if (failed) throw new Error('Property failed (reported by fc.check)')
  })
}

const DISCARD = Symbol('discard')
const FAIL = Symbol('fail')

/* Steps of one test case: hit a label, discard the case, or fail */
type Step = string|typeof DISCARD|typeof FAIL
type Case = readonly Step[]

function runCase(hit: (label: string) => void, steps: Case): boolean {
  for (const step of steps) {
    if (step === FAIL) return false
    fc.pre(step !== DISCARD)
    hit(step)
  }
  return true
}

const isAccepted = (steps: Case) => !steps.includes(DISCARD)

const repeat = (n: number, steps: Case): Case[] =>
  Array.from({length: n}, () => steps)

/* One coverage instance; each call is one check, running the cases in order */
function checker(
  reqs      : Reqs,
  mode      : Mode = 'sync',
  entrypoint: Entrypoint = 'assert',
) {
  const {hit, plugin} = fcu.coverage(reqs)
  return (...cases: Case[]) => {
    const remaining = [...cases]
    const next = () => runCase(hit, remaining.shift() ?? [])
    const property = mode === 'sync'
      ? prop(next)
      : asyncProp(async () => { await Promise.resolve(); return next() })
    const numRuns = cases.filter(isAccepted).length
    return run(entrypoint, property, {numRuns, plugins: [plugin]})
  }
}

/* Messages of the thrown error and its cause (errors thrown by a predicate) */
async function thrown(run: () => unknown): Promise<string|undefined> {
  try { await run() }
  catch (error) {
    const {message, cause} = error as Error
    return [message, (cause as Error|undefined)?.message]
      .filter(Boolean)
      .join('\n')
  }
}

interface Scenario {
  reqs  : Reqs
  cases : Case[]
  /* the unmet labels, or the error; undefined: success */
  fails?: string[]|RegExp
}

async function expectOutcome(
  {reqs,cases,fails}: Scenario,
  mode?             : Mode,
  entrypoint?       : Entrypoint,
): Promise<void> {
  const message = await thrown(() => checker(reqs, mode, entrypoint)(...cases))
  if (fails instanceof RegExp)
    expect(message).toMatch(fails)
  else if (fails) {
    expect(message).toMatch(/coverage/i)
    expect(Object.keys(reqs).filter(l => message?.includes(l))).toEqual(fails)
  }
  else
    expect(message).toBeUndefined()
}

const srcFile = fileURLToPath(new URL('../src/coverage.ts', import.meta.url))

/* Throws, with a stack trace pointing at the caller rather than the library */
function expectCallerError(run: () => unknown): void {
  expect(run).toThrow(
    expect.objectContaining({stack: expect.not.stringContaining(srcFile)})
  )
}

const propertyFailure = /^Property failed/

const scenarios: Record<string, Scenario> = {
  'passes with no hits for a 0% label': {
    reqs : {optional: 0},
    cases: [[]],
  },
  'supports numeric-looking labels': {
    reqs : {0: 100},
    cases: [['0']],
  },
  'reports unmet labels only, counting repeat hits once': {
    reqs : {first: 100, second: 60, exactlyMet: 50},
    cases: [['first', 'first', 'second', 'exactlyMet'], []],
    fails: ['first', 'second'],
  },
  'meets exactly-met fractional percentages': {
    reqs : {x: 16.1},
    cases: [...repeat(161, ['x']), ...repeat(839, [])],
  },
  'excludes discarded cases and their hits': {
    reqs : {kept: 100, discarded: 1},
    cases: [['discarded', DISCARD], ['kept']],
    fails: ['discarded'],
  },
  'does not mask a property failure': {
    reqs : {covered: 100},
    cases: [[FAIL]],
    fails: propertyFailure,
  },
  'requires an accepted test case': {
    reqs : {optional: 0},
    cases: [],
    fails: /accepted/,
  },
  'rejects unknown labels, over unmet coverage': {
    reqs : {covered: 100},
    cases: [['unknown']],
    fails: /unknown/,
  },
}

/* Reference model: the `fails` of a scenario */
function model(reqs: Reqs, cases: Case[]): Scenario['fails'] {
  const accepted = cases.filter(isAccepted)
  const executed = cases.slice(0, cases.findLastIndex(isAccepted) + 1)
  const hitsOf = (steps: Case) =>
    isAccepted(steps) ? steps : steps.slice(0, steps.indexOf(DISCARD))
  const isUnknown = (step: Step) => typeof step === 'string' && !(step in reqs)
  if (executed.some(steps => hitsOf(steps).some(isUnknown)))
    return /unknown/
  if (accepted.length === 0)
    return /accepted/
  const hits = (label: string) => accepted.filter(s => s.includes(label)).length
  const unmet = Object.entries(reqs)
    .filter(([label, pct]) => hits(label) * 100 < pct * accepted.length)
    .map(([label]) => label)
  return unmet.length > 0 ? unmet : undefined
}

describe('coverage', () => {
  describe.each<[Entrypoint, Mode]>([
    ['assert', 'sync'],
    ['assert', 'async'],
    ['check', 'sync'],
    ['check', 'async'],
  ])('fc.%s, %s', (entrypoint, mode) => {
    it.each(Object.entries(scenarios))('%s', (_, scenario) =>
      expectOutcome(scenario, mode, entrypoint))
  })

  it('agrees with a reference model', async () => {
    const labels = ['lbl0', 'lbl1', 'lbl2']
    const pct = fc.integer({min: 0, max: 100})
    const step = fc.constantFrom<Step>(...labels, DISCARD)
    await fc.assert(fc.asyncProperty(
      fc.dictionary(fc.constantFrom(...labels), pct, {minKeys: 1}),
      fc.array(fc.array(step, {maxLength: 4}), {maxLength: 8}),
      (reqs, cases) => expectOutcome({reqs, cases, fails: model(reqs, cases)}),
    ))
  })

  describe('rejects', () => {
    it.each<Reqs>([
      {},
      {x: 101},
      {x: -1},
      {x: Number.NaN},
      {x: Number.POSITIVE_INFINITY},
    ])('requirements %o', reqs => {
      expectCallerError(() => fcu.coverage(reqs))
    })

    it.each<[string, RegExp, (cov: fcu.Coverage<'x'>) => unknown]>([
      ['outside any check', /no property check/, ({hit}) => hit('x')],
      ['without the plugin', /no property check/, ({hit}) =>
        assertProp(() => hit('x'))],
      ['from an arbitrary', /arbitrary/, ({hit, plugin}) => {
        const arb = unit.map(() => hit('x'))
        return fc.assert(fc.property(arb, ok), {plugins: [plugin]})
      }],
      ['from an outer plugin', /outside/, ({hit, plugin}) =>
        assertProp(ok, fc.beforeEach(() => hit('x')), plugin)],
      ['with a duplicated plugin', /more than once/, ({hit, plugin}) =>
        assertProp(() => hit('x'), plugin, plugin)],
    ])('use %s', async (_, expected, misuse) => {
      const message = await thrown(() => misuse(fcu.coverage({x: 1})))
      expect(message).toMatch(expected)
    })
  })

  it('reports counts, percentages, seed and discards', async () => {
    const check = checker({first: 100, second: 60})
    const message = await thrown(() =>
      check(['first', 'second'], ['second', DISCARD], []))
    expect(message).toMatch(/\bseed\b\D*\b1\b/)
    expect(message).toMatch(/\bskipped\b\D*\b1\b/)
    expect(message).toMatch(/\bfirst\b.*\b1\/2\b.*\b50(\.0+)?%.*\b100%/)
    expect(message).toMatch(/\bsecond\b.*\b1\/2\b.*\b50(\.0+)?%.*\b60%/)
  })

  it('does not round a percentage up to the requirement', () => {
    expect(() => checker({x: 66.67})(['x'], ['x'], [])).toThrow(/66\.66%/)
  })

  it.each<Entrypoint>(['assert', 'check'])(
    'reports unmet coverage from the caller (fc.%s)',
    entrypoint => {
      const check = checker({x: 1}, 'sync', entrypoint)
      expectCallerError(() => check([]))
    },
  )

  it('is not asserted when replaying a failure', () => {
    const {plugin} = fcu.coverage({covered: 100})
    fc.assert(prop(ok), {path: '0', plugins: [plugin]})
  })

  describe('@fast-check/vitest', () => {
    const cov = () => fcu.coverage({covered: 100})

    const tuple = cov()
    fcIt.prop([unit], {plugins: [tuple.plugin]})('tuple form', () =>
      tuple.hit('covered'))

    const record = cov()
    fcIt.prop({x: unit}, {plugins: [record.plugin]})('record form', () =>
      record.hit('covered'))

    const unmet = cov()
    fcIt.fails.prop([unit], {plugins: [unmet.plugin]})(
      'unmet coverage fails the test', ok)
  })

  describe('can be reused after', () => {
    it('coverage and property failures', () => {
      const check = checker({covered: 100})
      expect(() => check([])).toThrow('covered')
      expect(() => check(['covered', FAIL])).toThrow(propertyFailure)
      check(['covered'])
    })

    const abort = (): never => { throw new Error('aborted') }
    /* aborts within the covered run; must come after the coverage plugin */
    const abortInRun = (run: () => never|Promise<never>): Plugin =>
      () => ({decorateRun: () => run})

    it.each<[string, (plugin: Plugin) => unknown]>([
      ['generator', p =>
        fc.assert(fc.property(unit.map(abort), ok), {plugins: [p]})],
      ['nested run', p =>
        assertProp(ok, p, abortInRun(abort))],
      ['async nested run', p =>
        assertAsync(async () => true, p, abortInRun(async () => abort()))],
      ['later plugin', p =>
        assertProp(ok, p, abort)],
    ])('a check aborted by a throwing %s', async (_, abortedCheck) => {
      const {hit, plugin} = fcu.coverage({covered: 100})
      expect(await thrown(() => abortedCheck(plugin))).toBe('aborted')
      assertProp(() => hit('covered'), plugin)
    })

    it.each<[string, Plugin, unknown]>([
      ['fc.timeout', fc.timeout(10), expect.stringMatching(/timeout/)],
      ['fc.interruptAfterTimeLimit', fc.interruptAfterTimeLimit(10), undefined],
    ])('a run abandoned by %s, keeping its outcome', async (_, outer, want) => {
      const {hit, plugin} = fcu.coverage({x: 0})
      /* the second run outlives the time limit, and is abandoned by `outer` */
      let runs = 0
      const property = fc.asyncProperty(fc.integer(), async () => {
        runs += 1
        const ms = runs === 2 ? 200 : 1
        await new Promise(resolve => setTimeout(resolve, ms))
        hit('x')
      })
      const check = () => fc.assert(property, {plugins: [outer, plugin]})
      expect(await thrown(check)).toEqual(want)
      await fc.assert(property, {plugins: [plugin], numRuns: 3})
    })
  })

  describe('concurrent property checks', () => {
    it('allow distinct instances', async () => {
      const check = ({hit, plugin}: fcu.Coverage<'x'>) =>
        assertAsync(async () => { await Promise.resolve(); hit('x') }, plugin)
      const cov = () => fcu.coverage({x: 100})
      await Promise.all([check(cov()), check(cov())])
    })

    it('reject a shared instance', async () => {
      const {plugin} = fcu.coverage({covered: 0})
      let release: () => void = () => undefined
      const gate = new Promise<void>(resolve => { release = resolve })

      let afterAllRan = false
      const spy: Plugin = () => ({afterAll: () => { afterAllRan = true }})

      const first = assertAsync(() => gate, plugin)
      expect(() => assertProp(ok, plugin, spy)).toThrow(/concurrent/)
      expect(afterAllRan).toBe(true)
      release()
      await expect(first).rejects.toThrow(/concurrent/)
    })
  })
})
