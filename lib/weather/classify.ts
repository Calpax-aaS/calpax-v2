import type { HourlyWeather, WindLevel, WeatherSummary } from './types'

export function classifyWind(speedKt: number, seuilKt: number): WindLevel {
  if (speedKt > seuilKt + 5) return 'DANGER'
  if (speedKt >= seuilKt) return 'WARNING'
  return 'OK'
}

const ALTITUDES = ['10m', '80m', '120m', '180m'] as const
const ALTITUDE_KEYS = ['wind10m', 'wind80m', 'wind120m', 'wind180m'] as const

export function summarizeWeather(hours: readonly HourlyWeather[], seuilKt: number): WeatherSummary {
  let maxWindKt = 0
  let maxWindAltitude = '10m'

  for (const hour of hours) {
    for (let i = 0; i < ALTITUDE_KEYS.length; i++) {
      const key = ALTITUDE_KEYS[i]!
      const alt = ALTITUDES[i]!
      const wind = hour[key]
      if (wind.speed > maxWindKt) {
        maxWindKt = wind.speed
        maxWindAltitude = alt
      }
    }
  }

  const avgTemperature =
    hours.length > 0
      ? Math.round(hours.reduce((sum, h) => sum + h.temperature, 0) / hours.length)
      : 0

  return {
    maxWindKt,
    maxWindAltitude,
    level: classifyWind(maxWindKt, seuilKt),
    avgTemperature,
  }
}
