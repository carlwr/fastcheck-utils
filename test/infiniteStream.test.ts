import { fail } from "node:assert"
import { fc, it } from "@fast-check/vitest"
import { expect } from "vitest"
import * as fcu from "../src/index.js"


it('can be sampled (docstring example)', () => {
  const arb = fcu.infiniteStream(fc.nat({max:10}))
  const stream = fc.sample(arb, {seed:1})[0] ?? fail()
  const arr: number[] = []
  arr.push(fcu.getNext(stream))
  arr.push(fcu.getNext(stream))
  expect(arr).toHaveLength(2)
})

it('generates values', () => {
  const failTest = false // switch to true to inspect shrink tree
  const arb = fcu.infiniteStream(fc.integer({ min: 0, max: 100 }))

  fc.assert(fc.property(arb, (stream) => {
    const val1 = fcu.getNext(stream)
    const val2 = fcu.getNext(stream)
    const val3 = fcu.getNext(stream)

    expect(typeof val1).toBe('number')
    expect(typeof val2).toBe('number')
    expect(typeof val3).toBe('number')

    if (failTest) { expect(val1).toBe(-1) }
  }), {
    seed   : 1,
    verbose: failTest ? 2 : 0
  })
})
