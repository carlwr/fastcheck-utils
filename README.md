
# fastcheck-utils

_utilities and improved generators for [fast-check](https://github.com/dubzzz/fast-check)_

[![ci](https://img.shields.io/github/actions/workflow/status/carlwr/fastcheck-utils/ci.yaml?branch=main&logo=github&label=ci)](https://github.com/carlwr/fastcheck-utils/actions/workflows/ci.yaml)
[![npm](https://img.shields.io/npm/v/@carlwr/fastcheck-utils?logo=npm)](https://www.npmjs.com/package/@carlwr/fastcheck-utils)
[![node](https://img.shields.io/node/v/@carlwr/fastcheck-utils?logo=nodedotjs)](https://www.npmjs.com/package/@carlwr/fastcheck-utils)
[![license](https://img.shields.io/npm/l/@carlwr/fastcheck-utils)](https://github.com/carlwr/fastcheck-utils/blob/main/LICENSE)

Links:
* github: [github.com/carlwr/fastcheck-utils](https://github.com/carlwr/fastcheck-utils)
* npm: [www.npmjs.com/package/@carlwr/fastcheck-utils](https://www.npmjs.com/package/@carlwr/fastcheck-utils)

## Installation

```bash
npm install @carlwr/fastcheck-utils
```

`fast-check` is a peer dependency of this package. It should be picked up by the package manager also if you depend on e.g. `@fast-check/vitest` or `@fast-check/jest` rather than on `fast-check` directly.

## Authoring

This `README.md` file, and any _JSDoc_ documentation, is written entirely by me, Carl, a human developer. [Agents are not allowed][AGENTS.md] to touch the prose of these.

I-the-human implemented everything up to and including _v0.5.2_. For later versions, agentic tools may be used as a development tool; with myself as the reviewer and ultimate decision-maker. I am and will remain the sole author of this `README.md` file and any _JSDoc_.

[AGENTS.md]: ./AGENTS.md

---

## Utilities and generators


### `coverage`

```ts
function coverage<K>(requirements: Readonly<Record<K, number>>): Coverage<K>
```
Add minimum coverage checks to a property test.

In a test, the user first calls `coverage`, specifying the labels to use and, for each label, a minimum percentage of test cases that must "hit" the label for the coverage to be considered sufficient. The user then adds conditional calls to `hit()` to the test.

If the property test itself succeeds, the number of test cases that were run is compared to the number of hits for each label. If the specified minimum percentage was not met for at least one label, the property test still fails, with a useful message.

For an introduction to the coverage feature, the primary resource is the [example file](https://github.com/carlwr/fastcheck-utils/blob/main/test/coverage.example.test.ts).

Calls to `hit()` must specify one of the registered labels. This is enforced on the type level.

If the property fails, that error takes precedence and coverage is not asserted.

When counting the number of test cases (the denominator) and the number of hits,
- discarded cases are not included
- if a label is hit more than once, it is still only counted once
- _examples_ are included in the count of number of test cases (they contribute to the denominator)
- shrinking runs are not included (which does not matter, since in the case of the property failing, coverage is not checked anyways)

If there are no accepted test cases in a test, the coverage check will result in a coverage failure.

It is strongly recommended to use a fixed seed for tests that include coverage checks.

If a property is _replayed_, the coverage test will be ignored (since it isn't meaningful in replays).

`hit()` can only be called from a test - not from within an arbitrary or `fc.beforeEach`. If you want to use coverage to assert on the distribution of an arbitrary, it is suggested to write a dedicated property test.

If you use the `fc.ignoreEqualValues()` plugin: if used it must come before this coverage plugin, e.g. `[fc.ignoreEqualValues(), myCoverage.plugin]`.

**parameters / returns:**

- _param_ `requirements`: A record where the user specifies labels as keys and required hit percentages as values
- _returns:_ An object with the `hit()` function for the user to call, and the `plugin` value to pass to something that accepts a `fast-check` plugin, e.g. `fast-check`'s `fc.assert`/`fc.check`, or `@fast-check/vitest`'s `it.prop`/`test.prop`. The plugin will be ignored if used with `fc.sample` or `fc.statistics`. Passing it to `fc.check` will result in coverage failures to throw, rather than report the failure. Passing it to `fc.installGlobalPlugin` does not make sense since that would mean the same requirements would be applied to all checks.

### `element`

```ts
function element<T>(xs: readonly [T, T]): Arbitrary<T>
```
Randomly choose one of the constant array values.

Shrinking is done towards the first element.

Similar to `fc.constantFrom`, but _shrinks across all elements_ - `fc.constantFrom` only shrinks towards the first element.

example:

```ts
import * as fcu from '@carlwr/fastcheck-utils'
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

This arbitrary is a minimal wrapper around `fc.infiniteStream` allowing access to the generated values in a type-safe way through the `getNext` helper.

features and non-features:
- does _not_ shrink at all unfortunately - since `fc.infiniteStream` doesn't
- _does_ print a meaningful counterexample and execution summary on failure, that includes some of the previously tried values in the stream

example:

```ts
import * as fcu from '@carlwr/fastcheck-utils'
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
import * as fcu from '@carlwr/fastcheck-utils'
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
import * as fcu from '@carlwr/fastcheck-utils'
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
like `fc.record`, but with
- `noNullPrototype` _true_ by default
- stronger typing

example:

```ts
import * as fcu from '@carlwr/fastcheck-utils'
import * as fc from 'fast-check'

const arb = fcu.record({name: fc.string(), age: fc.nat({max: 100})})
const sample = fc.sample(arb, {seed:1})[0] ?? fail()
console.log(sample)  // {name: 'TVb~o"nP', age: 36}
```
