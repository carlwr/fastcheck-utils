import { isNonEmpty } from "@carlwr/typescript-extra";
import * as fc from 'fast-check';

export { nonEmptyUniqueArray }

/**
 * Generate a non-empty array of unique values.
 *
 * @example
 * import * as fcu from 'fastcheck-utils'
 * import * as fc from 'fast-check'
 *
 * const arb = fcu.nonEmptyUniqueArray(fc.nat({max:10}))
 * const sample = fc.sample(arb, {seed:1})[0]
 * console.log(sample)  // [2, 6, 5, 9, 4, 7, 10, 3, 1, 0, 8]
 */
function nonEmptyUniqueArray<T, U = T>(
  arb         : fc.Arbitrary<T>,
  constraints?: fc.UniqueArrayConstraints<T, U>
): fc.Arbitrary<[T,...T[]]> {

  const base = constraints ?? {} as fc.UniqueArrayConstraints<T, U>;
  const constr: fc.UniqueArrayConstraints<T, U> = {
    ...base,
    minLength: Math.max(base.minLength ?? 1, 1)
  };

  const ret = fc.uniqueArray(arb, constr).filter(isNonEmpty)
  return ret as fc.Arbitrary<[T,...T[]]>
}
