'use server'

import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { piloteSchema } from '@/lib/schemas/pilote'
import { encrypt } from '@/lib/crypto'

function extractPiloteData(formData: FormData) {
  return {
    prenom: formData.get('prenom'),
    nom: formData.get('nom'),
    email: formData.get('email') || undefined,
    telephone: formData.get('telephone') || undefined,
    poids: formData.get('poids') || undefined,
    licenceBfcl: formData.get('licenceBfcl'),
    qualificationCommerciale: formData.get('qualificationCommerciale') === 'true',
    dateExpirationLicence: formData.get('dateExpirationLicence'),
    classesBallon: formData.getAll('classesBallon').map(String),
    heuresDeVol: formData.get('heuresDeVol') || undefined,
  }
}

/**
 * Create a new pilote for the current tenant.
 * Encrypts poids before storing. Redirects to detail page on success.
 */
export async function createPilote(
  locale: string,
  formData: FormData,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const ctx = getContext()

    const raw = extractPiloteData(formData)
    const result = piloteSchema.safeParse(raw)
    if (!result.success) {
      const firstError = result.error.issues[0]
      return { error: firstError?.message ?? 'Données invalides' }
    }

    const { poids, ...rest } = result.data
    const data = {
      ...rest,
      poidsEncrypted: poids != null ? encrypt(poids.toString()) : null,
      exploitantId: ctx.exploitantId,
    }

    const pilote = await db.pilote.create({ data })

    redirect(`/${locale}/pilotes/${pilote.id}`)
  })
}

/**
 * Update an existing pilote.
 * Re-encrypts poids if provided. Redirects to detail page on success.
 */
export async function updatePilote(
  id: string,
  locale: string,
  formData: FormData,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const raw = extractPiloteData(formData)
    const result = piloteSchema.safeParse(raw)
    if (!result.success) {
      const firstError = result.error.issues[0]
      return { error: firstError?.message ?? 'Données invalides' }
    }

    const { poids, ...rest } = result.data
    const data = {
      ...rest,
      poidsEncrypted: poids != null ? encrypt(poids.toString()) : null,
    }

    await db.pilote.update({ where: { id }, data })

    redirect(`/${locale}/pilotes/${id}`)
  })
}

/**
 * Toggle the actif flag of a pilote.
 */
export async function togglePiloteActif(id: string, actif: boolean): Promise<{ error?: string }> {
  return requireAuth(async () => {
    await db.pilote.update({
      where: { id },
      data: { actif },
    })
    return {}
  })
}
