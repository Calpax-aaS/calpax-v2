import { describe, it, expect } from 'vitest'
import { formatReference, computeLuhnChecksum, verifyReference } from '@/lib/billet/reference'

describe('formatReference', () => {
  it('formats with prefix, year, and zero-padded sequence', () => {
    expect(formatReference('CBF', 2026, 42)).toBe('CBF-2026-0042')
  })

  it('formats single-digit sequence', () => {
    expect(formatReference('CBF', 2026, 1)).toBe('CBF-2026-0001')
  })

  it('formats 5-digit sequence without truncation', () => {
    expect(formatReference('CBF', 2026, 12345)).toBe('CBF-2026-12345')
  })
})

describe('computeLuhnChecksum', () => {
  it('returns a single digit string', () => {
    const cs = computeLuhnChecksum('CBF-2026-0042')
    expect(cs).toMatch(/^\d$/)
  })

  it('is deterministic', () => {
    const a = computeLuhnChecksum('CBF-2026-0042')
    const b = computeLuhnChecksum('CBF-2026-0042')
    expect(a).toBe(b)
  })

  it('differs for different references', () => {
    const a = computeLuhnChecksum('CBF-2026-0042')
    const b = computeLuhnChecksum('CBF-2026-0043')
    expect(a).not.toBe(b)
  })
})

describe('verifyReference', () => {
  it('returns true for a valid reference+checksum pair', () => {
    const ref = 'CBF-2026-0042'
    const cs = computeLuhnChecksum(ref)
    expect(verifyReference(ref, cs)).toBe(true)
  })

  it('returns false for a wrong checksum', () => {
    expect(verifyReference('CBF-2026-0042', '0')).toBe(false)
  })
})
