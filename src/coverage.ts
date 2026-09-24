import { andFinally, andThen } from '@carlwr/typescript-extra/maybe-async'
import type * as fc from 'fast-check'
import { callerError } from './utils.js'

type DetailsWithSkips = Pick<fc.RunDetails<unknown>, 'seed'|'numSkips'>

const MSG = {
  noLabels: () =>
    'coverage requires at least one label',

  badPercent: (label: string) =>
    `coverage percentage for ${JSON.stringify(label)} must be between 0 and 100`,

  outsideCase: () =>
    'coverage.hit() called outside an active test case',

  inGenerator: () =>
    'coverage.hit() cannot be called from an arbitrary',

  noCheck: () =>
    'coverage.hit() called, but no property check with coverage.plugin is running',

  duplicatePlugin: () =>
    'coverage.plugin passed more than once to the same property check',

  unknownLabel: (label: string) =>
    `unknown coverage label ${JSON.stringify(label)}`,

  concurrentUse: () =>
    'coverage cannot be shared by concurrent property checks',

  runSummary: (details: DetailsWithSkips) =>
    `{ seed: ${details.seed}, skipped: ${details.numSkips} }`,

  noAccepted: () =>
    'coverage requires at least one accepted test case',

  unmetHeader: (accepted: number) =>
    `coverage failed after ${accepted} accepted test cases`,

  unmetLine: ({label, minimum, count}: Unmet, accepted: number) => {
    const haveStr = `${count}/${accepted} (${percent(count, accepted)}%)`
    const reqStr = `required >= ${minimum}%`
    return `- ${label}: ${haveStr}, ${reqStr}`
  },

  notRunning: (checks: number, isGenerating: boolean) => {
    if (checks === 0) return MSG.noCheck()
    if (isGenerating  ) return MSG.inGenerator()
    return MSG.outsideCase()
  }
}

/* JSDoc style stance:
Don't overwhelm the reader with details. Prefer clarity and conveying the concepts in a simple way over documenting every single truth about the behaviour.
*/

/**
 * Coverage for property tests.
 *
 * A single instance cannot be used for multiple concurrently running tests. Re-using the same instance for multiple sequential tests is fine.
 */
export interface Coverage<L extends string> {
  /** Register a hit for a label. */
  readonly hit: (label: L) => void

  /** A plugin value to pass to `fast-check`. */
  readonly plugin: <Ts>(pluginIndex: number, pluginStore: fc.PluginStore) => fc.PluginInstance<Ts>
}

/**
 * Add minimum coverage checks to a property test.
 *
 * In a test, the user first calls `coverage`, specifying the labels to use and, for each label, a minimum percentage of test cases that must "hit" the label for the coverage to be considered sufficient. The user then adds conditional calls to {@linkcode Coverage.hit | hit()} to the test.
 *
 * If the property test itself succeeds, the number of test cases that were run is compared to the number of hits for each label. If the specified minimum percentage was not met for at least one label, the property test still fails, with a useful message.
 *
 * For an introduction to the coverage feature, the primary resource is the {@link https://github.com/carlwr/fastcheck-utils/blob/main/test/coverage.example.test.ts | example file}.
 *
 * Calls to {@linkcode Coverage.hit | hit()} must specify one of the registered labels. This is enforced on the type level.
 *
 * If the property fails, that error takes precedence and coverage is not asserted.
 *
 * When counting the number of test cases (the denominator) and the number of hits,
 * - discarded cases are not included
 * - if a label is hit more than once, it is still only counted once
 * - _examples_ are included in the count of number of test cases (they contribute to the denominator)
 * - shrinking runs are not included (which does not matter, since in the case of the property failing, coverage is not checked anyways)
 *
 * If there are no accepted test cases in a test, the coverage check will result in a coverage failure.
 *
 * It is strongly recommended to use a fixed seed for tests that include coverage checks.
 *
 * If a property is _replayed_, the coverage test will be ignored (since it isn't meaningful in replays).
 *
 * {@linkcode Coverage.hit | hit()} can only be called from a test - not from within an arbitrary or {@linkcode fc.beforeEach}. If you want to use coverage to assert on the distribution of an arbitrary, it is suggested to write a dedicated property test.
 *
 * If you use the `fc.ignoreEqualValues()` plugin: if used it must come before this coverage plugin, e.g. `[fc.ignoreEqualValues(), myCoverage.plugin]`.
 *
 * @param requirements A record where the user specifies labels as keys and required hit percentages as values
 * @returns An object with the {@linkcode Coverage.hit | hit()} function for the user to call, and the {@linkcode Coverage.plugin | plugin} value to pass to something that accepts a `fast-check` plugin, e.g. `fast-check`'s {@linkcode fc.assert}/{@linkcode fc.check}, or `@fast-check/vitest`'s `it.prop`/`test.prop`. The plugin will be ignored if used with {@linkcode fc.sample} or {@linkcode fc.statistics}. Passing it to {@linkcode fc.check} will result in coverage failures to throw, rather than report the failure. Passing it to {@linkcode fc.installGlobalPlugin} does not make sense since that would mean the same requirements would be applied to all checks.
 */
export function coverage<K extends string>(
  requirements: Readonly<Record<K, number>>
): Coverage<K> {
  const minimums = new Map(Object.entries<number>(requirements))

  const bad = badRequirements(minimums)
  if (bad.length > 0)
    throw callerError(coverage, bad.join('\n'))

  const storeKey = Symbol('coverage')
  let running: RunningCase|undefined
  let checks = 0
  let generating = false

  function hit(label: string): void {
    if (!running)
      throw callerError(hit, MSG.notRunning(checks, generating))
    if (minimums.has(label))
      running.hits.add(label)
    else
      running.tally.usageError ??= callerError(hit, MSG.unknownLabel(label))
  }

  const plugin: Coverage<K>['plugin'] = (_, store) => {
    if (store.get(storeKey))
      throw callerError(plugin, MSG.duplicatePlugin())
    store.set(storeKey, true)
    checks += 1
    const tally: Tally = {
      accepted  : 0,
      hits      : new Map(),
      usageError: undefined
    }

    return {
      decorateGenerate: nestedGenerate => (...args) => {
        generating = true
        try { return nestedGenerate(...args) }
        finally {
          generating = false
        }
      },

      decorateRun: nestedRun => function coveredRun(value) {
        /* same tally: a previous run was abandoned by an outer plugin (e.g. fc.timeout) */
        if (running && running.tally !== tally) {
          const error = callerError(coveredRun, MSG.concurrentUse())
          running.tally.usageError ??= error
          tally.usageError         ??= error
          return nestedRun(value)
        }
        const hits = new Set<string>()
        const current = {tally, hits}
        running = current
        const outcome = andFinally(
          () => nestedRun(value),
          () => { if (running === current) running = undefined },
        )
        const f = <T>(result: T) => {
          if (!result)
            countCase(tally, hits)
          return result
        }
        return andThen(outcome, f)
      },

      /* throws also for fc.check: plugins cannot mark a run as failed */
      onAllRunsComplete: function checkCoverage(details) {
        if (details.failed   ) return
        if (tally.usageError ) throw tally.usageError
        if (isReplay(details)) return // coverage not meaningful

        if (!isCovered(minimums, tally))
          throw callerError(checkCoverage, report_(minimums, tally, details))
      },

      /* a run abandoned by an outer plugin (e.g. fc.timeout) may still be pending */
      afterAll: () => {
        checks -= 1
        if (running?.tally === tally)
          running = undefined
      },
    }
  }

  return {hit, plugin}
}

function isReplay<Ts>(details: fc.RunDetails<Ts>): boolean {
  return !!details.runConfiguration.path
}

interface Tally {
  accepted  : number
  hits      : Map<string, number>
  usageError: Error|undefined
}

interface RunningCase {
  tally: Tally
  hits : Set<string>
}

interface Unmet {
  label  : string
  minimum: number
  count  : number
}

type Minimums = ReadonlyMap<string, number>

function isMet({minimum, count}: Unmet, accepted: number) {
  return count * 100 / accepted >= minimum
}

function isCovered(minimums: Minimums, tally: Tally) {
  const unmet = unmetLabels(minimums, tally)
  const {accepted} = tally
  return accepted > 0 && unmet.length === 0
}

function isPercentage(minimum: number) {
  return Number.isFinite(minimum) && minimum >= 0 && minimum <= 100
}

function countCase(tally: Tally, hits: ReadonlySet<string>): void {
  tally.accepted += 1
  for (const label of hits)
    tally.hits.set(label, (tally.hits.get(label) ?? 0) + 1)
}

function percent(part: number, whole: number): string {
  return (Math.floor(part * 10000 / whole) / 100).toFixed(2)
}

function unmetLabels(minimums: Minimums, tally: Tally): Unmet[] {
  return [...minimums]
    .map(([label, minimum]) => ({
      label,
      minimum,
      count: tally.hits.get(label) ?? 0,
    }))
    .filter(u => !isMet(u, tally.accepted))
}

function badRequirements(minimums: Minimums): string[] {
  if (minimums.size === 0)
    return [MSG.noLabels()]
  return [...minimums]
    .filter(([, minimum]) => !isPercentage(minimum))
    .map(([label]) => MSG.badPercent(label))
}

function report_(
  minimums: Minimums,
  tally   : Tally,
  details: DetailsWithSkips,
): string {
  const unmet = unmetLabels(minimums, tally)
  const {accepted} = tally
  const summary = MSG.runSummary(details)
  if (accepted === 0)
    return [MSG.noAccepted(), summary].join('\n')

  return [
    MSG.unmetHeader(accepted),
    summary,
    ...unmet.map(u => MSG.unmetLine(u, accepted)),
  ].join('\n')
}
