import type { WeatherForecast, HourlyWeather } from './types'

const CRENEAU_RANGES: Record<string, { start: number; end: number }> = {
  MATIN: { start: 5, end: 10 },
  SOIR: { start: 17, end: 22 },
}

export function extractCreneauHours(
  forecast: WeatherForecast,
  creneau: 'MATIN' | 'SOIR',
): HourlyWeather[] {
  const range = CRENEAU_RANGES[creneau]!
  return forecast.hours.filter((h) => {
    const hour = parseInt(h.time.slice(0, 2))
    return hour >= range.start && hour <= range.end
  })
}
