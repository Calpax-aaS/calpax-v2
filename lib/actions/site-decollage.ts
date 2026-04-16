'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRole } from '@/lib/auth/requireRole'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { z } from 'zod'

const siteDecollageSchema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  adresse: z.string().optional().or(z.literal('')),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  notes: z.string().optional().or(z.literal('')),
})

export async function createSiteDecollage(
  locale: string,
  formData: FormData,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    const ctx = getContext()

    const raw = {
      nom: formData.get('nom'),
      adresse: formData.get('adresse') || undefined,
      latitude: formData.get('latitude') || undefined,
      longitude: formData.get('longitude') || undefined,
      notes: formData.get('notes') || undefined,
    }

    const result = siteDecollageSchema.safeParse(raw)
    if (!result.success) {
      const firstError = result.error.issues[0]
      return { error: firstError?.message ?? 'Donnees invalides' }
    }

    await db.siteDecollage.create({
      data: {
        nom: result.data.nom,
        adresse: result.data.adresse || null,
        latitude: result.data.latitude ?? null,
        longitude: result.data.longitude ?? null,
        notes: result.data.notes || null,
        exploitantId: ctx.exploitantId,
      },
    })

    revalidatePath(`/${locale}/sites`)
    return {}
  })
}

export async function toggleSiteActif(siteId: string, locale: string): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    const site = await db.siteDecollage.findUniqueOrThrow({ where: { id: siteId } })
    await db.siteDecollage.update({
      where: { id: siteId },
      data: { actif: !site.actif },
    })
    revalidatePath(`/${locale}/sites`)
    return {}
  })
}
