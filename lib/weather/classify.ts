import type { HourlyWeather, WindLevel, WeatherSummary } from './types'

export function classifyWind(speedKmh: number, seuilKmh: number): WindLevel {
  if (speedKmh > seuilKmh + 5) return 'DANGER'
  if (speedKmh >= seuilKmh) return 'WARNING'
  return 'OK'
}

const ALTITUDES = ['10m', '80m', '120m', '180m'] as const
const ALTITUDE_KEYS = ['wind10m', 'wind80m', 'wind120m', 'wind180m'] as const

export function summarizeWeather(
  hours: readonly HourlyWeather[],
  seuilKmh: number,
): WeatherSummary {
  let maxWindKmh = 0
  let maxWindAltitude = '10m'

  for (const hour of hours) {
    for (let i = 0; i < ALTITUDE_KEYS.length; i++) {
      const key = ALTITUDE_KEYS[i]!
      const alt = ALTITUDES[i]!
      const wind = hour[key]
      if (wind.speed > maxWindKmh) {
        maxWindKmh = wind.speed
        maxWindAltitude = alt
      }
    }
  }

  const avgTemperature =
    hours.length > 0
      ? Math.round(hours.reduce((sum, h) => sum + h.temperature, 0) / hours.length)
      : 0

  return {
    maxWindKmh,
    maxWindAltitude,
    level: classifyWind(maxWindKmh, seuilKmh),
    avgTemperature,
  }
}
