import * as fc from 'fast-check'

export { infiniteStream, getNext }
export type { InfiniteStream }

interface InfiniteStream<T> extends fc.Stream<T> {}

/**
 * Generate an infinite stream of values.
 *
 * This arbitrary is a minimal wrapper around {@link fc.infiniteStream} allowing access to the generated values in a type-safe way through the {@link getNext} helper.
 *
 * features and non-features:
 * - does _not_ shrink at all unfortunately - since {@link fc.infiniteStream} doesn't
 * - _does_ print a meaningful counterexample and execution summary on failure, that includes some of the previously tried values in the stream
 *
 * @example
 * import * as fcu from 'fastcheck-utils'
 * import * as fc from 'fast-check'
 *
 * const arb = fcu.infiniteStream(fc.nat({max:10}))
 * const stream = fc.sample(arb, {seed:1})[0] ?? fail()
 * console.log(fcu.getNext(stream))  // 8
 * console.log(fcu.getNext(stream))  // 2
 */
function infiniteStream<T>(arb: fc.Arbitrary<T>): fc.Arbitrary<InfiniteStream<T>> {
  return fc.infiniteStream(arb) as fc.Arbitrary<InfiniteStream<T>>
}

/**
 * Get next value from an {@link InfiniteStream} object yielded by {@link infiniteStream}.
 *
 * Throws if the stream is unexpectedly done (it is my understanding that this should never happen).
 */
function getNext<T>(stream: InfiniteStream<T>): T {
  const {value, done} = stream.next()
  if (done) {
    throw new Error('infinite stream unexpectedly done')
  }
  return value
}
