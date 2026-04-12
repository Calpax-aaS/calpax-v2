import { describe, it, expect } from 'vitest'
import { parseOpenMeteoResponse } from '@/lib/weather/parse'

const SAMPLE_RESPONSE = {
  hourly: {
    time: ['2026-04-12T05:00', '2026-04-12T06:00', '2026-04-12T07:00'],
    wind_speed_10m: [5, 8, 10],
    wind_direction_10m: [180, 190, 200],
    wind_speed_80m: [8, 12, 14],
    wind_direction_80m: [185, 195, 205],
    wind_speed_120m: [10, 14, 16],
    wind_direction_120m: [190, 200, 210],
    wind_speed_180m: [12, 16, 18],
    wind_direction_180m: [195, 205, 215],
    temperature_2m: [12, 14, 16],
    cloud_cover: [20, 30, 40],
    precipitation_probability: [0, 5, 10],
  },
}

describe('parseOpenMeteoResponse', () => {
  it('parses into WeatherForecast with correct number of hours', () => {
    const forecast = parseOpenMeteoResponse(SAMPLE_RESPONSE, '2026-04-12')
    expect(forecast.date).toBe('2026-04-12')
    expect(forecast.hours).toHaveLength(3)
  })

  it('parses wind readings correctly', () => {
    const forecast = parseOpenMeteoResponse(SAMPLE_RESPONSE, '2026-04-12')
    const hour = forecast.hours[1]
    expect(hour?.wind10m).toEqual({ speed: 8, direction: 190 })
    expect(hour?.wind180m).toEqual({ speed: 16, direction: 205 })
  })

  it('parses temperature and cloud cover', () => {
    const forecast = parseOpenMeteoResponse(SAMPLE_RESPONSE, '2026-04-12')
    const hour = forecast.hours[0]
    expect(hour?.temperature).toBe(12)
    expect(hour?.cloudCover).toBe(20)
    expect(hour?.precipitationProb).toBe(0)
  })

  it('extracts time as HH:MM', () => {
    const forecast = parseOpenMeteoResponse(SAMPLE_RESPONSE, '2026-04-12')
    expect(forecast.hours[0]?.time).toBe('05:00')
    expect(forecast.hours[2]?.time).toBe('07:00')
  })
})
