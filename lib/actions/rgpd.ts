'use server'

import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRole } from '@/lib/auth/requireRole'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { basePrisma } from '@/lib/db/base'
import { decrypt } from '@/lib/crypto'

export type PassagerSearchResult = {
  id: string
  prenom: string
  nom: string
  email: string | null
  telephone: string | null
  billetReference: string
  billetId: string
}

export async function searchPassagers(query: string): Promise<PassagerSearchResult[]> {
  return requireAuth(async () => {
    if (!query || query.length < 2) return []

    const ctx = getContext()
    const pattern = `%${query}%`
    const passagers = await basePrisma.$queryRaw<
      {
        id: string
        prenom: string
        nom: string
        email: string | null
        telephone: string | null
        billetId: string
        billetReference: string
      }[]
    >`
      SELECT p.id, p.prenom, p.nom, p.email, p.telephone, p."billetId", b.reference AS "billetReference"
      FROM passager p
      JOIN billet b ON b.id = p."billetId"
      WHERE p."exploitantId" = ${ctx.exploitantId}
        AND (p.nom ILIKE ${pattern} OR p.prenom ILIKE ${pattern} OR p.email ILIKE ${pattern} OR p.telephone LIKE ${pattern})
      LIMIT 50
    `

    return passagers.map((p) => ({
      id: p.id,
      prenom: p.prenom,
      nom: p.nom,
      email: p.email,
      telephone: p.telephone,
      billetReference: p.billetReference,
      billetId: p.billetId,
    }))
  }) as Promise<PassagerSearchResult[]>
}

export async function exportPassagerData(passagerId: string): Promise<string> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    const passager = await db.passager.findUniqueOrThrow({
      where: { id: passagerId },
      include: { billet: { include: { paiements: true } } },
    })

    const poids = passager.poidsEncrypted
      ? (() => {
          try {
            return parseInt(decrypt(passager.poidsEncrypted))
          } catch {
            return null
          }
        })()
      : null

    const data = {
      passager: {
        prenom: passager.prenom,
        nom: passager.nom,
        email: passager.email,
        telephone: passager.telephone,
        age: passager.age,
        poids,
        pmr: passager.pmr,
      },
      billet: {
        reference: passager.billet.reference,
        statut: passager.billet.statut,
        montantTtc: passager.billet.montantTtc,
        paiements: passager.billet.paiements.map((p) => ({
          modePaiement: p.modePaiement,
          montantTtc: p.montantTtc,
          datePaiement: p.datePaiement,
        })),
      },
      exportedAt: new Date().toISOString(),
    }

    return JSON.stringify(data, null, 2)
  }) as Promise<string>
}

export async function anonymisePassager(passagerId: string): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    await db.passager.update({
      where: { id: passagerId },
      data: {
        prenom: 'SUPPRIME',
        nom: 'SUPPRIME',
        email: null,
        telephone: null,
        age: null,
        poidsEncrypted: null,
        pmr: false,
      },
    })
    return {}
  })
}
