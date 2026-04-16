'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRole } from '@/lib/auth/requireRole'
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
    dateExpirationLicence: formData.get('dateExpirationLicence'),
    heuresDeVol: formData.get('heuresDeVol') || undefined,
    // BFCL.200 classes — checkbox fields send 'on' when checked, absent when unchecked
    classeA: formData.get('classeA'),
    classeB: formData.get('classeB'),
    classeC: formData.get('classeC'),
    classeD: formData.get('classeD'),
    // BFCL.200 groupes (classe A)
    groupeA1: formData.get('groupeA1'),
    groupeA2: formData.get('groupeA2'),
    groupeA3: formData.get('groupeA3'),
    groupeA4: formData.get('groupeA4'),
    // Qualifications
    qualificationCommerciale: formData.get('qualificationCommerciale'),
    qualificationNuit: formData.get('qualificationNuit'),
    qualificationInstructeur: formData.get('qualificationInstructeur'),
    qualificationCaptif: formData.get('qualificationCaptif'),
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
    requireRole('ADMIN_CALPAX', 'GERANT')
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
    requireRole('ADMIN_CALPAX', 'GERANT')
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

    revalidatePath(`/${locale}/pilotes/${id}`)
    redirect(`/${locale}/pilotes/${id}`)
  })
}

/**
 * Toggle the actif flag of a pilote.
 */
export async function togglePiloteActif(id: string, actif: boolean): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    await db.pilote.update({
      where: { id },
      data: { actif },
    })
    return {}
  })
}
