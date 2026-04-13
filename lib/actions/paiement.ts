'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { paiementCreateSchema } from '@/lib/schemas/paiement'
import { computeStatutPaiement } from '@/lib/billet/paiement'

async function recalcStatutPaiement(billetId: string): Promise<void> {
  const billet = await db.billet.findUniqueOrThrow({ where: { id: billetId } })
  const paiements = await db.paiement.findMany({
    where: { billetId },
    select: { montantTtc: true },
  })
  const statut = computeStatutPaiement(
    Number(billet.montantTtc),
    paiements.map((p) => Number(p.montantTtc)),
  )
  await db.billet.update({
    where: { id: billetId },
    data: { statutPaiement: statut },
  })
}

export async function addPaiement(
  billetId: string,
  locale: string,
  formData: FormData,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const ctx = getContext()

    const raw = {
      modePaiement: formData.get('modePaiement'),
      montantTtc: formData.get('montantTtc'),
      datePaiement: formData.get('datePaiement'),
      dateEncaissement: formData.get('dateEncaissement') || undefined,
      commentaire: formData.get('commentaire') || undefined,
    }

    const result = paiementCreateSchema.safeParse(raw)
    if (!result.success) {
      const firstError = result.error.issues[0]
      return { error: firstError?.message ?? 'Donnees invalides' }
    }

    await db.paiement.create({
      data: {
        ...result.data,
        billetId,
        exploitantId: ctx.exploitantId,
      },
    })

    await recalcStatutPaiement(billetId)

    revalidatePath(`/${locale}/billets/${billetId}`)
    return {}
  })
}

export async function deletePaiement(
  paiementId: string,
  billetId: string,
  locale: string,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    await db.paiement.delete({ where: { id: paiementId } })
    await recalcStatutPaiement(billetId)

    revalidatePath(`/${locale}/billets/${billetId}`)
    return {}
  })
}
