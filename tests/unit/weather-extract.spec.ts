import { describe, it, expect } from 'vitest'
import { extractCreneauHours } from '@/lib/weather/extract'
import type { WeatherForecast, HourlyWeather } from '@/lib/weather/types'

function makeHour(time: string): HourlyWeather {
  return {
    time,
    wind10m: { speed: 5, direction: 0 },
    wind80m: { speed: 8, direction: 0 },
    wind120m: { speed: 10, direction: 0 },
    wind180m: { speed: 12, direction: 0 },
    temperature: 15,
    cloudCover: 30,
    precipitationProb: 0,
  }
}

const FULL_DAY: WeatherForecast = {
  date: '2026-04-12',
  hours: Array.from({ length: 24 }, (_, i) => makeHour(String(i).padStart(2, '0') + ':00')),
}

describe('extractCreneauHours', () => {
  it('extracts MATIN hours 05:00-10:00', () => {
    const hours = extractCreneauHours(FULL_DAY, 'MATIN')
    expect(hours).toHaveLength(6)
    expect(hours[0].time).toBe('05:00')
    expect(hours[5].time).toBe('10:00')
  })

  it('extracts SOIR hours 17:00-22:00', () => {
    const hours = extractCreneauHours(FULL_DAY, 'SOIR')
    expect(hours).toHaveLength(6)
    expect(hours[0].time).toBe('17:00')
    expect(hours[5].time).toBe('22:00')
  })

  it('returns empty array if no matching hours', () => {
    const partial: WeatherForecast = {
      date: '2026-04-12',
      hours: [makeHour('12:00'), makeHour('13:00')],
    }
    const hours = extractCreneauHours(partial, 'MATIN')
    expect(hours).toHaveLength(0)
  })
})
