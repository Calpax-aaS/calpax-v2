import { describe, it, expect } from 'vitest'
import { classifyWind, summarizeWeather } from '@/lib/weather/classify'
import type { HourlyWeather } from '@/lib/weather/types'

function makeHour(overrides: Partial<HourlyWeather> = {}): HourlyWeather {
  return {
    time: '06:00',
    wind10m: { speed: 0, direction: 0 },
    wind80m: { speed: 0, direction: 0 },
    wind120m: { speed: 0, direction: 0 },
    wind180m: { speed: 0, direction: 0 },
    temperature: 15,
    cloudCover: 0,
    precipitationProb: 0,
    ...overrides,
  }
}

describe('classifyWind', () => {
  it('returns OK when speed < threshold (10 vs 15)', () => {
    expect(classifyWind(10, 15)).toBe('OK')
  })

  it('returns OK when speed = threshold - 1 (14 vs 15)', () => {
    expect(classifyWind(14, 15)).toBe('OK')
  })

  it('returns WARNING when speed = threshold (15 vs 15)', () => {
    expect(classifyWind(15, 15)).toBe('WARNING')
  })

  it('returns WARNING when speed between threshold and threshold+5 (18 vs 15)', () => {
    expect(classifyWind(18, 15)).toBe('WARNING')
  })

  it('returns WARNING when speed = threshold+5 (20 vs 15)', () => {
    expect(classifyWind(20, 15)).toBe('WARNING')
  })

  it('returns DANGER when speed > threshold+5 (21 vs 15)', () => {
    expect(classifyWind(21, 15)).toBe('DANGER')
  })

  it('returns OK for zero wind', () => {
    expect(classifyWind(0, 15)).toBe('OK')
  })
})

describe('summarizeWeather', () => {
  it('finds max wind across all altitudes and hours (22kt at 120m = DANGER)', () => {
    const hours: HourlyWeather[] = [
      makeHour({
        time: '06:00',
        temperature: 10,
        wind10m: { speed: 5, direction: 180 },
        wind80m: { speed: 8, direction: 180 },
        wind120m: { speed: 22, direction: 180 },
        wind180m: { speed: 12, direction: 180 },
      }),
      makeHour({
        time: '08:00',
        temperature: 20,
        wind10m: { speed: 3, direction: 90 },
        wind80m: { speed: 6, direction: 90 },
        wind120m: { speed: 10, direction: 90 },
        wind180m: { speed: 9, direction: 90 },
      }),
    ]
    const result = summarizeWeather(hours, 15)
    expect(result.maxWindKmh).toBe(22)
    expect(result.maxWindAltitude).toBe('120m')
    expect(result.level).toBe('DANGER')
  })

  it('computes average temperature (10+20)/2 = 15', () => {
    const hours: HourlyWeather[] = [makeHour({ temperature: 10 }), makeHour({ temperature: 20 })]
    const result = summarizeWeather(hours, 15)
    expect(result.avgTemperature).toBe(15)
  })

  it('returns OK level when all winds below threshold', () => {
    const hours: HourlyWeather[] = [
      makeHour({
        wind10m: { speed: 5, direction: 0 },
        wind80m: { speed: 8, direction: 0 },
        wind120m: { speed: 10, direction: 0 },
        wind180m: { speed: 7, direction: 0 },
      }),
    ]
    const result = summarizeWeather(hours, 15)
    expect(result.level).toBe('OK')
  })

  it('handles empty hours array (maxWindKmh=0, level=OK)', () => {
    const result = summarizeWeather([], 15)
    expect(result.maxWindKmh).toBe(0)
    expect(result.level).toBe('OK')
  })
})
