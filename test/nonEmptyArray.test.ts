import { fc, it } from "@fast-check/vitest"
import { describe, expect, it as it_vitest } from "vitest"
import * as fcu from "../src/index.js"


it('can be sampled (docstring example)', () => {
  const arb = fcu.nonEmptyArray(fc.nat({max:5}))
  const sample = fc.sample(arb, {seed:1})[0]
  expect(sample).toStrictEqual([5, 4, 2, 2, 5, 0, 3, 1, 5, 3, 1])
})

describe('a generated array', () => {

  const arb = fcu.nonEmptyArray(fc.nat({max:10}))

  it.prop([arb])('should not be empty', (arr) => {
    expect(arr.length).toBeGreaterThan(0)
  })

})

describe('a passed constraints object', () => {

  const constr_min5 = { minLength: 5 }
  const arb_min5 = fcu.nonEmptyArray(fc.nat({max:10}), constr_min5)

  it.prop([arb_min5])('should be honored, if OK', (arr) => {
    expect(arr.length).toBeGreaterThanOrEqual(5)
  })

  it_vitest('should throw if minLength is 0', () => {
    expect(getMakeArb({minLength: 0})).toThrow()
  })

  it_vitest('should throw if maxLength is 0', () => {
    expect(getMakeArb({maxLength: 0})).toThrow()
  })

  it_vitest('should throw if maxLength is less than minLength', () => {
    expect(getMakeArb({maxLength: 5, minLength: 10})).toThrow()
  })

})

function getMakeArb(constr: fc.ArrayConstraints) {
  return () => fcu.nonEmptyArray(fc.nat({max:10}), constr)
}
