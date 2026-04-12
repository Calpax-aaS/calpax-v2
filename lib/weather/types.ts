export type WindReading = {
  speed: number // knots
  direction: number // degrees
}

export type HourlyWeather = {
  time: string // "06:00"
  wind10m: WindReading
  wind80m: WindReading
  wind120m: WindReading
  wind180m: WindReading
  temperature: number // Celsius
  cloudCover: number // percentage 0-100
  precipitationProb: number // percentage 0-100
}

export type WeatherForecast = {
  date: string // YYYY-MM-DD
  hours: HourlyWeather[]
}

export type WindLevel = 'OK' | 'WARNING' | 'DANGER'

export type WeatherSummary = {
  maxWindKt: number
  maxWindAltitude: string
  level: WindLevel
  avgTemperature: number
}
