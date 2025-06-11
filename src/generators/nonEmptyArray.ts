import * as fc from 'fast-check';

export { nonEmptyArray }

/**
 * Generate a non-empty array.
 *
 * If a {@link constraints} parameter object is passed, it will be honored (function throws if `{minLength: 0}` is specified).
 *
 * @example
 * import * as fcu from 'fastcheck-utils'
 * import * as fc from 'fast-check'
 *
 * const arb = fcu.nonEmptyArray(fc.nat({max:5}))
 * const sample = fc.sample(arb, {seed:1})[0]
 * console.log(sample)  // [5, 4, 2, 2, 5, 0, 3, 1, 5, 3, 1]
 */
function nonEmptyArray<T>(
  arb         : fc.Arbitrary<T>,
  constraints?: fc.ArrayConstraints
): fc.Arbitrary<[T,...T[]]> {

  if (constraints?.minLength === 0) {
    throw new Error("minLength cannot be 0 for non-empty array");
  }

  const base = constraints ?? { minLength: 1 };
  const constr: fc.ArrayConstraints = base.minLength !== undefined
    ? base
    : { ...base, minLength: 1 };

  return fc.array(arb, constr) as fc.Arbitrary<[T,...T[]]>
}
