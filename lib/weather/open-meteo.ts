import type { OpenMeteoResponse } from './parse'

type FetchWeatherParams = {
  latitude: number
  longitude: number
  date: string // YYYY-MM-DD
}

export async function fetchWeatherFromAPI(params: FetchWeatherParams): Promise<OpenMeteoResponse> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(params.latitude))
  url.searchParams.set('longitude', String(params.longitude))
  url.searchParams.set(
    'hourly',
    'wind_speed_10m,wind_direction_10m,wind_speed_80m,wind_direction_80m,wind_speed_120m,wind_direction_120m,wind_speed_180m,wind_direction_180m,temperature_2m,cloud_cover,precipitation_probability',
  )
  url.searchParams.set('wind_speed_unit', 'kn')
  url.searchParams.set('start_date', params.date)
  url.searchParams.set('end_date', params.date)

  const res = await fetch(url.toString(), { next: { revalidate: 0 } })
  if (!res.ok) {
    throw new Error(`Open-Meteo API error: ${res.status} ${res.statusText}`)
  }

  return res.json() as Promise<OpenMeteoResponse>
}
