import * as fc from 'fast-check'
import { expect, it } from 'vitest'
import * as fcu from '../src/index.js'


// An example function we want to test with a property test:

/**
 * Clamp a value to a range.
 *
 * @example
 * myClamp(7 , -10, 10)  // 7
 * myClamp(14, -10, 10)  // 10
 */
function myClamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}


// An ordinary property test for testing the function `myClamp`:

it('clamps values to a range (without coverage)', () => {

  fc.assert(
    fc.property(fc.integer({min: -100, max: 100}), value => {
      const result = myClamp(value, -10, 10)

      if (value < -10) {
        expect(result).toBe(-10)
      } else if (value > 10) {
        expect(result).toBe(10)
      } else {
        expect(result).toBe(value)
      }
    }),
    {
      seed: 1,
      numRuns: 100,
    }
  )
})


// The same test, but with coverage requirements:

it('clamps values to a range', () => {
  const cov = fcu.coverage({
    label_below: 20,  // >= 20% of test cases required to hit this label
    label_above: 20,  // >= 20% of test cases required to hit this label
  })

  fc.assert(
    fc.property(fc.integer({min: -100, max: 100}), value => {
      const result = myClamp(value, -10, 10)

      if (value < -10) {
        expect(result).toBe(-10)
        cov.hit('label_below')
      } else if (value > 10) {
        expect(result).toBe(10)
        cov.hit('label_above')
      } else {
        expect(result).toBe(value)
      }
    }),
    {
      seed: 1,
      numRuns: 100,
      plugins: [cov.plugin],
    }
  )
})
