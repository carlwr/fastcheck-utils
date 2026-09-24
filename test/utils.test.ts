import { describe, expect, it } from 'vitest'
import { callerError } from '../src/utils.js'


describe('callerError', () => {

  it('hides the frames of the given function', () => {
    function thrower() { return callerError(thrower, 'msg') }
    function caller () { return thrower() }
    const {stack} = caller()
    expect(stack).toContain('msg')
    expect(stack).not.toContain('at thrower')
    expect(stack).toContain('at caller')
  })

  it('leaves no frames for a function not on the stack', () => {
    function elsewhere() {}
    const {stack} = callerError(elsewhere, 'msg')
    expect(stack).toContain('msg')
    expect(stack).not.toContain('at ')
  })

})
