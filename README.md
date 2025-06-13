
# fastcheck-utils

_improved generators for [fast-check](https://github.com/dubzzz/fast-check)_

Links:
* github: [github.com/carlwr/fastcheck-utils](https://github.com/carlwr/fastcheck-utils)
* npm: [www.npmjs.com/package/@carlwr/fastcheck-utils](https://www.npmjs.com/package/@carlwr/fastcheck-utils)

## Installation

```bash
npm install @carlwr/fastcheck-utils
```

`fast-check` is a peer dependency of this package. It should be picked up by the package manager also if you depend on e.g. `@fast-check/vitest` or `@fast-check/jest` rather than on `fast-check` directly.

to run checks and tests:
```bash
npm qa
```

---

## Generators


### `element`

```ts
function element<T>(xs: readonly [T, T]): Arbitrary<T>
```
Randomly choose one of the constant array values.

Shrinking is done towards the first element.

Similar to fc.constantFrom, but _shrinks across all elements_ - fc.constantFrom only shrinks towards the first element.

example:

```ts
import * as fcu from 'fastcheck-utils'
import * as fc from 'fast-check'

const arb = fcu.element(['a', 'b', 'c'] as const)
const samples = fc.sample(arb, {seed:1, numRuns:3})
console.log(samples)  // ['b', 'c', 'b']
```

### `getNext`

```ts
function getNext<T>(stream: InfiniteStream<T>): T
```
Get next value from an `InfiniteStream` object yielded by `infiniteStream`.

Throws if the stream is unexpectedly done (it is my understanding that this should never happen).

### `infiniteStream`

```ts
function infiniteStream<T>(arb: Arbitrary<T>): Arbitrary<InfiniteStream<T>>
```
Generate an infinite stream of values.

This arbitrary is a minimal wrapper around fc.infiniteStream allowing access to the generated values in a type-safe way through the `getNext` helper.

features and non-features:
- does _not_ shrink at all unfortunately - since fc.infiniteStream doesn't
- _does_ print a meaningful counterexample and execution summary on failure, that includes some of the previously tried values in the stream

example:

```ts
import * as fcu from 'fastcheck-utils'
import * as fc from 'fast-check'

const arb = fcu.infiniteStream(fc.nat({max:10}))
const stream = fc.sample(arb, {seed:1})[0] ?? fail()
console.log(fcu.getNext(stream))  // 8
console.log(fcu.getNext(stream))  // 2
```

### `nonEmptyArray`

```ts
function nonEmptyArray<T>(arb: Arbitrary<T>, constraints?: ArrayConstraints): Arbitrary<[T, ...T[]]>
```
Generate a non-empty array.

If a `constraints` parameter object is passed, it will be honored (function throws if `{minLength: 0}` is specified).

example:

```ts
import * as fcu from 'fastcheck-utils'
import * as fc from 'fast-check'

const arb = fcu.nonEmptyArray(fc.nat({max:5}))
const sample = fc.sample(arb, {seed:1})[0]
console.log(sample)  // [5, 4, 2, 2, 5, 0, 3, 1, 5, 3, 1]
```

### `nonEmptyUniqueArray`

```ts
function nonEmptyUniqueArray<T, U>(arb: Arbitrary<T>, constraints?: UniqueArrayConstraints<T, U>): Arbitrary<[T, ...T[]]>
```
Generate a non-empty array of unique values.

example:

```ts
import * as fcu from 'fastcheck-utils'
import * as fc from 'fast-check'

const arb = fcu.nonEmptyUniqueArray(fc.nat({max:10}))
const sample = fc.sample(arb, {seed:1})[0]
console.log(sample)  // [2, 6, 5, 9, 4, 7, 10, 3, 1, 0, 8]
```

### `record`

```ts
function record<T>(model: Model<T>): Arbitrary<ExactRecord<T>>

function record<T>(model: Model<T>, constr: AllKeysRequired<T>): Arbitrary<ExactRecord<T>>

function record<T, K>(model: Model<T>, constr: SomeKeysRequired<T, K>): Arbitrary<{ [K in string | number | symbol]: (Partial<T> & Pick<T, K & keyof T>)[K] }>
```
like fc.record, but with
- `noNullPrototype` _true_ by default
- stronger typing

example:

```ts
import * as fcu from 'fastcheck-utils'
import * as fc from 'fast-check'

const arb = fcu.record({name: fc.string(), age: fc.nat({max: 100})})
const sample = fc.sample(arb, {seed:1})[0] ?? fail()
console.log(sample)  // {name: 'TVb~o"nP', age: 36}
```