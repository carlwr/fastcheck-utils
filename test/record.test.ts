import { fc } from "@fast-check/vitest"
import { describe, expect, it } from "vitest"
import * as fcu from "../src/index.js"


const model = {name: fc.string(), age: fc.nat({max: 100})}

describe('record', () => {

  it('accepts requiredKeys with a subset of keys', () => {
    expect(() => fcu.record(model, {requiredKeys: ['name']})).not.toThrow()
  })

  it('accepts requiredKeys with every key', () => {
    expect(() => fcu.record(model, {requiredKeys: ['name', 'age']})).not.toThrow()
  })

  it('accepts requiredKeys with every key, in another order', () => {
    expect(() => fcu.record(model, {requiredKeys: ['age', 'name']})).not.toThrow()
  })

})
