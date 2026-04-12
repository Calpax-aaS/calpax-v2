'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { getWeather } from '@/lib/weather/cache'

export async function refreshWeather(volId: string, locale: string): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const vol = await db.vol.findUniqueOrThrow({
      where: { id: volId },
      include: { exploitant: { select: { meteoLatitude: true, meteoLongitude: true } } },
    })

    if (!vol.exploitant.meteoLatitude || !vol.exploitant.meteoLongitude) {
      return { error: 'Coordonnees GPS non configurees' }
    }

    const dateStr = vol.date.toISOString().slice(0, 10)

    await getWeather({
      exploitantId: vol.exploitantId,
      latitude: vol.exploitant.meteoLatitude,
      longitude: vol.exploitant.meteoLongitude,
      date: dateStr,
      forceRefresh: true,
    })

    revalidatePath(`/${locale}/vols/${volId}`)
    return {}
  })
}
