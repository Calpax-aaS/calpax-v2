'use server'

import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { ballonSchema } from '@/lib/schemas/ballon'

function extractPerformanceChart(formData: FormData): Record<string, number> {
  const chart: Record<string, number> = {}
  for (let t = 10; t <= 34; t++) {
    const val = formData.get(`chart_${t}`)
    if (val && String(val).trim() !== '') {
      chart[String(t)] = Number(val)
    }
  }
  return chart
}

function extractBallonData(formData: FormData) {
  return {
    nom: formData.get('nom'),
    immatriculation: formData.get('immatriculation'),
    volume: formData.get('volume'),
    nbPassagerMax: formData.get('nbPassagerMax'),
    peseeAVide: formData.get('peseeAVide'),
    configGaz: formData.get('configGaz'),
    manexAnnexRef: formData.get('manexAnnexRef'),
    mtom: formData.get('mtom') || undefined,
    mlm: formData.get('mlm') || undefined,
    camoOrganisme: formData.get('camoOrganisme') || undefined,
    camoExpiryDate: formData.get('camoExpiryDate') || undefined,
    certificatNavigabilite: formData.get('certificatNavigabilite') || undefined,
    performanceChart: extractPerformanceChart(formData),
  }
}

/**
 * Create a new ballon for the current tenant.
 * Validates with ballonSchema, creates via db, then redirects to the detail page.
 */
export async function createBallon(
  locale: string,
  formData: FormData,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const ctx = getContext()

    const raw = extractBallonData(formData)
    const result = ballonSchema.safeParse(raw)
    if (!result.success) {
      const firstError = result.error.issues[0]
      return { error: firstError?.message ?? 'Données invalides' }
    }

    const ballon = await db.ballon.create({
      data: {
        ...result.data,
        exploitantId: ctx.exploitantId,
      },
    })

    redirect(`/${locale}/ballons/${ballon.id}`)
  })
}

/**
 * Update an existing ballon.
 * Validates with ballonSchema, updates via db, then redirects to the detail page.
 */
export async function updateBallon(
  id: string,
  locale: string,
  formData: FormData,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const raw = extractBallonData(formData)
    const result = ballonSchema.safeParse(raw)
    if (!result.success) {
      const firstError = result.error.issues[0]
      return { error: firstError?.message ?? 'Données invalides' }
    }

    await db.ballon.update({
      where: { id },
      data: result.data,
    })

    redirect(`/${locale}/ballons/${id}`)
  })
}

/**
 * Toggle the actif flag of a ballon.
 */
export async function toggleBallonActif(id: string, actif: boolean): Promise<{ error?: string }> {
  return requireAuth(async () => {
    await db.ballon.update({
      where: { id },
      data: { actif },
    })
    return {}
  })
}
