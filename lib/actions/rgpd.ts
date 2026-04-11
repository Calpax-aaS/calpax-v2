'use server'

import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
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

    const passagers = await db.passager.findMany({
      where: {
        OR: [
          { nom: { contains: query, mode: 'insensitive' } },
          { prenom: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { telephone: { contains: query } },
        ],
      },
      include: { billet: { select: { id: true, reference: true } } },
      take: 50,
    })

    return passagers.map((p) => ({
      id: p.id,
      prenom: p.prenom,
      nom: p.nom,
      email: p.email,
      telephone: p.telephone,
      billetReference: p.billet.reference,
      billetId: p.billet.id,
    }))
  }) as Promise<PassagerSearchResult[]>
}

export async function exportPassagerData(passagerId: string): Promise<string> {
  return requireAuth(async () => {
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
