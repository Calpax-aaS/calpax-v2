'use server'

import { AuditAction } from '@prisma/client'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRole } from '@/lib/auth/requireRole'
import { writeAudit } from '@/lib/audit/write'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { safeDecryptInt, safeDecryptString } from '@/lib/crypto'

export type PassagerSearchResult = {
  id: string
  prenom: string
  nom: string
  email: string | null
  telephone: string | null
  billetReference: string
  billetId: string
}

const selectFields = {
  id: true,
  prenom: true,
  nom: true,
  emailEncrypted: true,
  telephoneEncrypted: true,
  billetId: true,
  billet: { select: { reference: true } },
} as const

export async function searchPassagers(query: string): Promise<PassagerSearchResult[]> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    if (!query || query.length < 2) return []

    // AES-GCM is non-deterministic so the encrypted columns can't be
    // pattern-matched with Prisma `contains`. We filter nom / prenom at the
    // DB layer (still plaintext) and keep an in-memory pass over a bounded
    // window of recently-updated passagers to catch email / phone hits.
    const [dbMatches, recentForPiiScan] = await Promise.all([
      db.passager.findMany({
        where: {
          OR: [
            { nom: { contains: query, mode: 'insensitive' } },
            { prenom: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: selectFields,
        take: 50,
      }),
      db.passager.findMany({
        where: { OR: [{ emailEncrypted: { not: null } }, { telephoneEncrypted: { not: null } }] },
        select: selectFields,
        orderBy: { updatedAt: 'desc' },
        take: 500,
      }),
    ])

    const lowerQuery = query.toLowerCase()
    const emailMatches = recentForPiiScan.filter((p) => {
      const email = safeDecryptString(p.emailEncrypted)
      const phone = safeDecryptString(p.telephoneEncrypted)
      return (
        (email?.toLowerCase().includes(lowerQuery) ?? false) || (phone?.includes(query) ?? false)
      )
    })

    const seen = new Set<string>()
    const all = [...dbMatches, ...emailMatches].filter((p) => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })

    return all.slice(0, 50).map((p) => ({
      id: p.id,
      prenom: p.prenom,
      nom: p.nom,
      email: safeDecryptString(p.emailEncrypted),
      telephone: safeDecryptString(p.telephoneEncrypted),
      billetReference: p.billet.reference,
      billetId: p.billetId,
    }))
  })
}

export async function exportPassagerData(passagerId: string): Promise<string> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    const ctx = getContext()
    const passager = await db.passager.findUniqueOrThrow({
      where: { id: passagerId },
      include: { billet: { include: { paiements: true } } },
    })

    const poids = passager.poidsEncrypted ? safeDecryptInt(passager.poidsEncrypted, 0) : null

    const data = {
      passager: {
        prenom: passager.prenom,
        nom: passager.nom,
        email: safeDecryptString(passager.emailEncrypted),
        telephone: safeDecryptString(passager.telephoneEncrypted),
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

    // GDPR Art. 30: record every export of personal data. No PII in the log;
    // just the fact that the export happened, who triggered it and which
    // record was touched.
    await writeAudit({
      exploitantId: ctx.exploitantId,
      userId: ctx.userId,
      impersonatedBy: ctx.impersonatedBy ?? null,
      entityType: 'Passager',
      entityId: passager.id,
      action: AuditAction.EXPORT_PII,
    })

    return JSON.stringify(data, null, 2)
  })
}

export async function anonymisePassager(passagerId: string): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    const ctx = getContext()
    await db.passager.update({
      where: { id: passagerId },
      data: {
        prenom: 'SUPPRIME',
        nom: 'SUPPRIME',
        emailEncrypted: null,
        telephoneEncrypted: null,
        age: null,
        poidsEncrypted: null,
        pmr: false,
      },
    })

    // GDPR Art. 17: the underlying UPDATE is already captured by the audit
    // extension, but we emit an explicit ANONYMIZE_PII row so right-to-erasure
    // events stay trivially queryable regardless of which fields changed.
    await writeAudit({
      exploitantId: ctx.exploitantId,
      userId: ctx.userId,
      impersonatedBy: ctx.impersonatedBy ?? null,
      entityType: 'Passager',
      entityId: passagerId,
      action: AuditAction.ANONYMIZE_PII,
    })

    return {}
  })
}
