import * as fc from 'fast-check';


/**
 * like {@link fc.record}, but with
 * - `noNullPrototype` _true_ by default
 * - stronger typing
 *
 * @example
 * import * as fcu from 'fastcheck-utils'
 * import * as fc from 'fast-check'
 *
 * const arb = fcu.record({name: fc.string(), age: fc.nat({max: 100})})
 * const sample = fc.sample(arb, {seed:1})[0] ?? fail()
 * console.log(sample)  // {name: 'TVb~o"nP', age: 36}
 */
export function record<T>(
  model: Model<T>
): fc.Arbitrary<ExactRecord<T>>

export function record<T>(
  model : Model<T>,
  constr: AllKeysRequired<T>
): fc.Arbitrary<ExactRecord<T>>

export function record<T, K extends keyof T>(
  model  : Model<T>,
  constr : SomeKeysRequired<T,K>
): fc.Arbitrary<fc.RecordValue<T,K>>

export function record<T, K extends keyof T = keyof T>(
  model  : Model<T>,
  constr?: fc.RecordConstraints<K>
):| fc.Arbitrary<ExactRecord<T>>
  | fc.Arbitrary<fc.RecordValue<T,K>>
  {

  const nnp = constr?.noNullPrototype ?? true

  if (!constr?.requiredKeys) {
    // No constraints or no requiredKeys specified - default to all keys required
    const constr_ = { noNullPrototype: nnp }
    return fc.record(model, constr_) as fc.Arbitrary<ExactRecord<T>>
  }

  const constr_ = {
    noNullPrototype: nnp,
    requiredKeys   : constr.requiredKeys
  }

  const arb = fc.record(model, constr_)

  const allKeys = Object.keys(model)
  const typedArb = isAllKeysRequired(constr.requiredKeys, allKeys)
    ? arb as fc.Arbitrary<ExactRecord<T>>
    : arb as fc.Arbitrary<fc.RecordValue<T,K>>

  return typedArb
}

function isAllKeysRequired(
  requiredKeys: PropertyKey[],
  allKeys     : PropertyKey[]
): boolean {
  return (
    requiredKeys.length === allKeys.length &&
    allKeys.every(requiredKeys.includes)
  )
}

type Model<T>       = { [K in keyof T]: fc.Arbitrary<T[K]> }
type ExactRecord<T> = { [K in keyof T]:              T[K] }

type AllKeysRequired<T> =
  fc.RecordConstraints<keyof T> &
  { requiredKeys: readonly (keyof T)[] }

type SomeKeysRequired<T, K extends keyof T> =
  fc.RecordConstraints<K> &
  { requiredKeys: readonly K[] }
