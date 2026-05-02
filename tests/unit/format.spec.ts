import { describe, it, expect } from 'vitest'
import { formatAuditValue } from '@/lib/format'

describe('formatAuditValue', () => {
  it('renders null and undefined as an em-dash', () => {
    expect(formatAuditValue(null)).toBe('—')
    expect(formatAuditValue(undefined)).toBe('—')
  })

  it('returns strings unchanged so the [REDACTED] marker stays readable', () => {
    expect(formatAuditValue('[REDACTED]')).toBe('[REDACTED]')
    expect(formatAuditValue('Cameron Balloons')).toBe('Cameron Balloons')
    expect(formatAuditValue('')).toBe('')
  })

  it('JSON-encodes scalars and complex values onto a single line', () => {
    expect(formatAuditValue(42)).toBe('42')
    expect(formatAuditValue(true)).toBe('true')
    expect(formatAuditValue(false)).toBe('false')
    expect(formatAuditValue(['A', 'B'])).toBe('["A","B"]')
    expect(formatAuditValue({ a: 1 })).toBe('{"a":1}')
  })
})
