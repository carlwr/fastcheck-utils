import { fc } from "@fast-check/vitest"
import { describe, expect, it } from "vitest"
import * as fcu from "../src/index.js"


it('can be sampled (docstring example)', () => {
  const arb = fcu.element(['a', 'b', 'c'] as const)
  const samples = fc.sample(arb, {seed:1, numRuns:3})
  expect(samples).toStrictEqual(['b', 'c', 'b'])
})

// example data to test:
const arr = Array.from({length:30}).map((_,i) => i) as [number, ...number[]]
const seed = 2

const arb = fcu.element(arr)
const cfg = {
  seed   : seed,
  verbose: fc.VerbosityLevel.Verbose
}

const testWithinATest = ( () =>
  fc.check(fc.property(arb, i => i<22), cfg)
)

describe('a failing fast-check property', () => {

  const runDetails = testWithinATest()

  describe('(preparation:)', () => {

    it('indeed fails, so shrinking is triggered', () => {
      expect(runDetails.failed).toBeTruthy()
    })

    it('reports an execution summary', () => {
      expect(runDetails.executionSummary.length).toBeGreaterThan(0)
    })

    it('reports the expected seed', () => {
      expect(runDetails.seed).toBe(seed)
    })

  })

  describe('(actual test:)', () => {

    it('shrinks to the simplest counterexample', () => {
      expect(runDetails.numShrinks).toBeGreaterThan(0)
      expect(runDetails.counterexample).toStrictEqual([22])
    })

  })

})
