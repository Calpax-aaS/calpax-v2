import { db } from '@/lib/db'
import { basePrisma } from '@/lib/db/base'
import { fetchWeatherFromAPI } from './open-meteo'
import { parseOpenMeteoResponse } from './parse'
import type { WeatherForecast } from './types'
import type { OpenMeteoResponse } from './parse'

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

type GetWeatherParams = {
  exploitantId: string
  latitude: number
  longitude: number
  date: string // YYYY-MM-DD
  forceRefresh?: boolean
}

export async function getWeather(params: GetWeatherParams): Promise<WeatherForecast> {
  const { exploitantId, latitude, longitude, date, forceRefresh } = params

  if (!forceRefresh) {
    const cached = await db.weatherCache.findUnique({
      where: { exploitantId_date: { exploitantId, date: new Date(date + 'T00:00:00Z') } },
    })

    if (cached) {
      const age = Date.now() - cached.fetchedAt.getTime()
      if (age < CACHE_TTL_MS) {
        return parseOpenMeteoResponse(cached.data as OpenMeteoResponse, date)
      }
    }
  }

  const response = await fetchWeatherFromAPI({ latitude, longitude, date })

  await basePrisma.weatherCache.upsert({
    where: { exploitantId_date: { exploitantId, date: new Date(date + 'T00:00:00Z') } },
    update: {
      data: response as unknown as Record<string, unknown>,
      fetchedAt: new Date(),
      latitude,
      longitude,
    },
    create: {
      exploitantId,
      date: new Date(date + 'T00:00:00Z'),
      data: response as unknown as Record<string, unknown>,
      latitude,
      longitude,
    },
  })

  return parseOpenMeteoResponse(response, date)
}
