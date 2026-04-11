'use server'

import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { volCreateSchema } from '@/lib/schemas/vol'
import { validateVolCreation } from '@/lib/vol/validation'

export async function createVol(locale: string, formData: FormData): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const ctx = getContext()

    const raw = {
      date: formData.get('date'),
      creneau: formData.get('creneau'),
      ballonId: formData.get('ballonId'),
      piloteId: formData.get('piloteId'),
      equipier: formData.get('equipier') || undefined,
      vehicule: formData.get('vehicule') || undefined,
      lieuDecollage: formData.get('lieuDecollage') || undefined,
      configGaz: formData.get('configGaz') || undefined,
      qteGaz: formData.get('qteGaz') || undefined,
    }

    const result = volCreateSchema.safeParse(raw)
    if (!result.success) {
      const firstError = result.error.issues[0]
      return { error: firstError?.message ?? 'Donnees invalides' }
    }

    const { ballonId, piloteId, date, creneau, ...rest } = result.data

    const [ballon, pilote, existingVols] = await Promise.all([
      db.ballon.findUniqueOrThrow({ where: { id: ballonId } }),
      db.pilote.findUniqueOrThrow({ where: { id: piloteId } }),
      db.vol.findMany({
        where: { date, statut: { not: 'ANNULE' } },
        select: { ballonId: true, piloteId: true, creneau: true },
      }),
    ])

    const validation = validateVolCreation({
      ballon,
      pilote,
      date,
      creneau,
      existingVols: existingVols.map((v) => ({
        ballonId: v.ballonId,
        piloteId: v.piloteId,
        creneau: v.creneau,
      })),
    })

    if (!validation.valid) {
      return { error: validation.errors.join('. ') }
    }

    const vol = await db.vol.create({
      data: {
        ...rest,
        date,
        creneau,
        ballonId,
        piloteId,
        exploitantId: ctx.exploitantId,
        configGaz: rest.configGaz || ballon.configGaz,
      },
    })

    redirect(`/${locale}/vols/${vol.id}`)
  })
}

export async function cancelVol(volId: string, locale: string): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const vol = await db.vol.findUniqueOrThrow({ where: { id: volId } })
    if (vol.statut === 'ARCHIVE') {
      return { error: "Impossible d'annuler un vol archive" }
    }

    const passagers = await db.passager.findMany({ where: { volId } })
    const billetIds = [...new Set(passagers.map((p) => p.billetId))]

    await db.passager.updateMany({ where: { volId }, data: { volId: null } })
    for (const billetId of billetIds) {
      await db.billet.update({ where: { id: billetId }, data: { statut: 'EN_ATTENTE' } })
    }

    await db.vol.update({ where: { id: volId }, data: { statut: 'ANNULE' } })

    redirect(`/${locale}/vols`)
  })
}
