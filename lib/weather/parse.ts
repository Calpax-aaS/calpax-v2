import type { WeatherForecast, HourlyWeather } from './types'

type OpenMeteoHourly = {
  time: string[]
  wind_speed_10m: number[]
  wind_direction_10m: number[]
  wind_speed_80m: number[]
  wind_direction_80m: number[]
  wind_speed_120m: number[]
  wind_direction_120m: number[]
  wind_speed_180m: number[]
  wind_direction_180m: number[]
  temperature_2m: number[]
  cloud_cover: number[]
  precipitation_probability: number[]
}

export type OpenMeteoResponse = {
  hourly: OpenMeteoHourly
}

export function parseOpenMeteoResponse(response: OpenMeteoResponse, date: string): WeatherForecast {
  const { hourly } = response
  const hours: HourlyWeather[] = hourly.time.map((t, i) => ({
    time: t.slice(11, 16),
    wind10m: { speed: hourly.wind_speed_10m[i] ?? 0, direction: hourly.wind_direction_10m[i] ?? 0 },
    wind80m: { speed: hourly.wind_speed_80m[i] ?? 0, direction: hourly.wind_direction_80m[i] ?? 0 },
    wind120m: {
      speed: hourly.wind_speed_120m[i] ?? 0,
      direction: hourly.wind_direction_120m[i] ?? 0,
    },
    wind180m: {
      speed: hourly.wind_speed_180m[i] ?? 0,
      direction: hourly.wind_direction_180m[i] ?? 0,
    },
    temperature: hourly.temperature_2m[i] ?? 0,
    cloudCover: hourly.cloud_cover[i] ?? 0,
    precipitationProb: hourly.precipitation_probability[i] ?? 0,
  }))

  return { date, hours }
}
