import { describe, it, expect } from 'vitest'
import { parseQteGazFromConfig } from '@/lib/vol/parse-config-gaz'

describe('parseQteGazFromConfig', () => {
  it('parses "4xCB2990 : 4x23 kg" → 92', () => {
    expect(parseQteGazFromConfig('4xCB2990 : 4x23 kg')).toBe(92)
  })

  it('parses "3xCB2901:3x30kg" → 90', () => {
    expect(parseQteGazFromConfig('3xCB2901:3x30kg')).toBe(90)
  })

  it('parses "2xCB2901+1xCB2380:2x30+29kg" → 89', () => {
    expect(parseQteGazFromConfig('2xCB2901+1xCB2380:2x30+29kg')).toBe(89)
  })

  it('parses "4xCB2903 : 4x36 kg" → 144', () => {
    expect(parseQteGazFromConfig('4xCB2903 : 4x36 kg')).toBe(144)
  })

  it('parses "4xCB2385 : 4x23 kg" → 92', () => {
    expect(parseQteGazFromConfig('4xCB2385 : 4x23 kg')).toBe(92)
  })

  it('returns null for string without colon', () => {
    expect(parseQteGazFromConfig('no colon here')).toBeNull()
  })

  it('returns null for unparseable weight part', () => {
    expect(parseQteGazFromConfig('stuff : abc')).toBeNull()
  })
})
