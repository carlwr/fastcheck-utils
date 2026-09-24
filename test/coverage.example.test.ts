import * as fc from 'fast-check'
import { expect, it } from 'vitest'
import * as fcu from '../src/index.js'

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

/* An ordinary property test for testing the function `myClamp`:
*/
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


/* The same test, but with a coverage check added: it requires that at least 20% of the generated values are `< -10`, and that at least 20% are `> 10`:
*/
it('clamps values to a range', () => {
  const myCoverage = fcu.coverage({
    myBelowRange: 20,
    myAboveRange: 20,
  })

  fc.assert(
    fc.property(fc.integer({min: -100, max: 100}), value => {
      const result = myClamp(value, -10, 10)

      if (value < -10) {
        expect(result).toBe(-10)
        myCoverage.hit('myBelowRange')
      } else if (value > 10) {
        expect(result).toBe(10)
        myCoverage.hit('myAboveRange')
      } else {
        expect(result).toBe(value)
      }
    }),
    {
      seed: 1,
      numRuns: 100,
      plugins: [myCoverage.plugin],
    }
  )
})
