import { safeIndex } from '@carlwr/typescript-extra';
import * as fc from 'fast-check';

/**
 * Randomly choose one of the constant array values.
 *
 * Shrinking is done towards the first element.
 *
 * Similar to {@link fc.constantFrom}, but _shrinks across all elements_ - {@link fc.constantFrom} only shrinks towards the first element.
 *
 * @example
 * import * as fcu from 'fastcheck-utils'
 * import * as fc from 'fast-check'
 *
 * const arb = fcu.element(['a', 'b', 'c'] as const)
 * const samples = fc.sample(arb, {seed:1, numRuns:3})
 * console.log(samples)  // ['b', 'c', 'b']
 */
export function element<T>(xs: readonly [T, ...T[]]): fc.Arbitrary<T> {
  const arb = fc.nat({max: xs.length - 1})
  return arb.map(i => safeIndex(xs, i))
}
