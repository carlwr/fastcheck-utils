import { allUnique } from "@carlwr/typescript-extra"
import { fc, it } from "@fast-check/vitest"
import { describe, expect } from "vitest"
import * as fcu from "../src/index.js"


it('can be sampled (docstring example)', () => {
  const arb = fcu.nonEmptyUniqueArray(fc.nat({max:10}))
  const sample = fc.sample(arb, {seed:1})[0]
  expect(sample).toStrictEqual([2, 6, 5, 9, 4, 7, 10, 3, 1, 0, 8])
})

const arb = fcu.nonEmptyUniqueArray(fc.nat({max:10}))

describe('a generated array', () => {

  it.prop([arb])('should not be empty', (arr) => {
    expect(arr.length).toBeGreaterThan(0)
  })

  it.prop([arb])('should have unique elements', (arr) => {
    expect(arr).toSatisfy(allUnique)
  })

})
