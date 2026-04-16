'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRole } from '@/lib/auth/requireRole'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { z } from 'zod'

const equipierSchema = z.object({
  prenom: z.string().min(1, 'Prenom requis'),
  nom: z.string().min(1, 'Nom requis'),
  telephone: z.string().optional().or(z.literal('')),
})

export async function createEquipier(
  locale: string,
  formData: FormData,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    const ctx = getContext()

    const raw = {
      prenom: formData.get('prenom'),
      nom: formData.get('nom'),
      telephone: formData.get('telephone') || undefined,
    }

    const result = equipierSchema.safeParse(raw)
    if (!result.success) {
      const firstError = result.error.issues[0]
      return { error: firstError?.message ?? 'Donnees invalides' }
    }

    await db.equipier.create({
      data: {
        ...result.data,
        telephone: result.data.telephone || null,
        exploitantId: ctx.exploitantId,
      },
    })

    revalidatePath(`/${locale}/equipiers`)
    return {}
  })
}

export async function toggleEquipierActif(
  equipierId: string,
  locale: string,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    const equipier = await db.equipier.findUniqueOrThrow({ where: { id: equipierId } })
    await db.equipier.update({
      where: { id: equipierId },
      data: { actif: !equipier.actif },
    })
    revalidatePath(`/${locale}/equipiers`)
    return {}
  })
}
