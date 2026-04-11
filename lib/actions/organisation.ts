'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'

export async function affecterBillet(
  volId: string,
  billetId: string,
  locale: string,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    await db.passager.updateMany({
      where: { billetId, volId: null },
      data: { volId },
    })

    await db.billet.update({
      where: { id: billetId },
      data: { statut: 'PLANIFIE' },
    })

    revalidatePath(`/${locale}/vols/${volId}/organiser`)
    return {}
  })
}

export async function desaffecterPassager(
  passagerId: string,
  volId: string,
  locale: string,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const passager = await db.passager.findUniqueOrThrow({ where: { id: passagerId } })

    await db.passager.update({
      where: { id: passagerId },
      data: { volId: null },
    })

    const remaining = await db.passager.count({
      where: { billetId: passager.billetId, volId },
    })

    if (remaining === 0) {
      await db.billet.update({
        where: { id: passager.billetId },
        data: { statut: 'EN_ATTENTE' },
      })
    }

    revalidatePath(`/${locale}/vols/${volId}/organiser`)
    return {}
  })
}

export async function confirmerVol(volId: string, locale: string): Promise<{ error?: string }> {
  return requireAuth(async () => {
    await db.vol.update({
      where: { id: volId },
      data: { statut: 'CONFIRME' },
    })

    revalidatePath(`/${locale}/vols/${volId}`)
    return {}
  })
}
