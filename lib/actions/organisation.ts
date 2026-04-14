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

    // All passagers now assigned — mark billet as PLANIFIE
    const unassigned = await db.passager.count({
      where: { billetId, volId: null },
    })

    if (unassigned === 0) {
      await db.billet.update({
        where: { id: billetId },
        data: { statut: 'PLANIFIE' },
      })
    }

    revalidatePath(`/${locale}/vols/${volId}/organiser`)
    return {}
  })
}

export async function affecterPassager(
  volId: string,
  passagerId: string,
  locale: string,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const passager = await db.passager.findUniqueOrThrow({ where: { id: passagerId } })

    await db.passager.update({
      where: { id: passagerId },
      data: { volId },
    })

    // Check if all passagers of this billet are now assigned (to any vol)
    const unassigned = await db.passager.count({
      where: { billetId: passager.billetId, volId: null },
    })

    if (unassigned === 0) {
      await db.billet.update({
        where: { id: passager.billetId },
        data: { statut: 'PLANIFIE' },
      })
    }

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

    // Any unassigned passager means billet is not fully planned
    await db.billet.update({
      where: { id: passager.billetId },
      data: { statut: 'EN_ATTENTE' },
    })

    revalidatePath(`/${locale}/vols/${volId}/organiser`)
    return {}
  })
}

export async function confirmerVol(volId: string, locale: string): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const vol = await db.vol.findUniqueOrThrow({
      where: { id: volId },
      select: { statut: true, exploitantId: true },
    })
    if (vol.statut !== 'PLANIFIE') {
      return { error: 'Seul un vol planifié peut être confirmé' }
    }

    await db.vol.update({
      where: { id: volId },
      data: { statut: 'CONFIRME' },
    })

    revalidatePath(`/${locale}/vols/${volId}`)
    return {}
  })
}
