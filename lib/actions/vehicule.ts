'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRole } from '@/lib/auth/requireRole'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { z } from 'zod'

const vehiculeSchema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  immatriculation: z.string().optional().or(z.literal('')),
})

export async function createVehicule(
  locale: string,
  formData: FormData,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    const ctx = getContext()

    const raw = {
      nom: formData.get('nom'),
      immatriculation: formData.get('immatriculation') || undefined,
    }

    const result = vehiculeSchema.safeParse(raw)
    if (!result.success) {
      const firstError = result.error.issues[0]
      return { error: firstError?.message ?? 'Donnees invalides' }
    }

    await db.vehicule.create({
      data: {
        ...result.data,
        immatriculation: result.data.immatriculation || null,
        exploitantId: ctx.exploitantId,
      },
    })

    revalidatePath(`/${locale}/vehicules`)
    return {}
  })
}

export async function toggleVehiculeActif(
  vehiculeId: string,
  locale: string,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    const vehicule = await db.vehicule.findUniqueOrThrow({ where: { id: vehiculeId } })
    await db.vehicule.update({
      where: { id: vehiculeId },
      data: { actif: !vehicule.actif },
    })
    revalidatePath(`/${locale}/vehicules`)
    return {}
  })
}
