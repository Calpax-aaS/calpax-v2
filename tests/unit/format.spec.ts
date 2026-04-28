import { describe, it, expect } from 'vitest'
import {
  formatDateFr,
  formatDateLong,
  formatDateMedium,
  formatDateTimeShort,
  formatDateWeekdayShort,
  formatDateDayMonth,
  parseDateOnly,
} from '@/lib/format'

describe('lib/format', () => {
  it('formatDateFr renders DD/MM/YYYY in French', () => {
    expect(formatDateFr(new Date('2026-04-28T10:00:00Z'))).toBe('28/04/2026')
  })

  it('formatDateMedium uses locale-appropriate short month', () => {
    const d = new Date('2026-04-28T12:00:00Z')
    expect(formatDateMedium(d, 'fr')).toMatch(/avr\.?/i)
    expect(formatDateMedium(d, 'en')).toMatch(/Apr/i)
  })

  it('formatDateLong includes weekday name', () => {
    const d = new Date('2026-04-28T12:00:00Z')
    expect(formatDateLong(d, 'fr')).toMatch(/mardi/i)
    expect(formatDateLong(d, 'en')).toMatch(/Tuesday/i)
  })

  it('formatDateTimeShort includes hh:mm', () => {
    const d = new Date('2026-04-28T08:30:00Z')
    expect(formatDateTimeShort(d, 'fr')).toMatch(/\d{2}:\d{2}/)
  })

  it('formatDateWeekdayShort renders short weekday + day + month', () => {
    const d = new Date('2026-04-28T12:00:00Z')
    const fr = formatDateWeekdayShort(d, 'fr')
    expect(fr).toMatch(/mar\.?/i)
    expect(fr).toMatch(/28/)
  })

  it('formatDateDayMonth omits weekday and year', () => {
    const d = new Date('2026-04-28T12:00:00Z')
    const fr = formatDateDayMonth(d, 'fr')
    expect(fr).toMatch(/28/)
    expect(fr).not.toMatch(/2026/)
  })

  it('parseDateOnly anchors at midday UTC to avoid TZ drift', () => {
    const d = parseDateOnly('2026-04-28')
    expect(d.toISOString()).toBe('2026-04-28T12:00:00.000Z')
  })
})
