import { AuditAction } from '@prisma/client'
import { basePrisma } from '@/lib/db/base'
import { writeAudit } from '@/lib/audit/write'
import { verifyCronRequest } from '@/lib/auth/cron'
import { logger } from '@/lib/logger'

// 6 day cooldown: weekly schedule in vercel.json (Mon 06:00 UTC). A leaked
// secret can only trigger a full scrub pass at that cadence, not in a loop.
const MIN_INTERVAL_MS = 6 * 24 * 60 * 60 * 1000

/**
 * RGPD 5-year retention cron. Anonymises PII on Billets + Passagers whose
 * `createdAt` is older than the cutoff so we comply with RGPD art. 5(1)(e)
 * (limitation de la conservation) and CLAUDE.md's "5 ans maximum" contract.
 *
 * Runs weekly on Monday 06:00 UTC (see vercel.json). Idempotent — records
 * already anonymised stay anonymised (replacement strings are the same).
 *
 * What's anonymised:
 *  - Passager: prenom, nom, emailEncrypted, telephoneEncrypted, poidsEncrypted → scrubbed
 *  - Billet: payeurCiv/Prenom/Nom/Email/Telephone/Adresse/Cp/Ville → scrubbed
 *
 * What's preserved for audit / financial records:
 *  - Billet reference, checksum, statut, montantTtc, dates
 *  - Passager structural link to billet + vol, age, pmr
 *  - Payment history (Paiement rows — no PII beyond amounts/dates)
 *
 * Requires `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request): Promise<Response> {
  const guard = await verifyCronRequest(request, 'rgpd-retention', {
    minIntervalMs: MIN_INTERVAL_MS,
  })
  if (!guard.ok) return guard.response

  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setFullYear(cutoff.getFullYear() - 5)

  // ── Passagers ──────────────────────────────────────────────────────────
  const stalePassagers = await basePrisma.passager.findMany({
    where: { createdAt: { lt: cutoff }, nom: { not: ANONYMIZED_NAME } },
    select: { id: true, exploitantId: true },
  })

  for (const p of stalePassagers) {
    await basePrisma.passager.update({
      where: { id: p.id },
      data: {
        prenom: ANONYMIZED_FIRSTNAME,
        nom: ANONYMIZED_NAME,
        emailEncrypted: null,
        telephoneEncrypted: null,
        poidsEncrypted: null,
      },
    })
    await writeAudit({
      exploitantId: p.exploitantId,
      entityType: 'Passager',
      entityId: p.id,
      action: AuditAction.UPDATE,
      field: 'rgpd_retention_5y',
      afterValue: { anonymizedAt: now.toISOString() },
    })
  }

  // ── Billets ────────────────────────────────────────────────────────────
  const staleBillets = await basePrisma.billet.findMany({
    where: { createdAt: { lt: cutoff }, payeurNom: { not: ANONYMIZED_NAME } },
    select: { id: true, exploitantId: true },
  })

  for (const b of staleBillets) {
    await basePrisma.billet.update({
      where: { id: b.id },
      data: {
        payeurCiv: null,
        payeurPrenom: ANONYMIZED_FIRSTNAME,
        payeurNom: ANONYMIZED_NAME,
        payeurEmail: null,
        payeurTelephone: null,
        payeurAdresse: null,
        payeurCp: null,
        payeurVille: null,
      },
    })
    await writeAudit({
      exploitantId: b.exploitantId,
      entityType: 'Billet',
      entityId: b.id,
      action: AuditAction.UPDATE,
      field: 'rgpd_retention_5y',
      afterValue: { anonymizedAt: now.toISOString() },
    })
  }

  const summary = {
    cutoff: cutoff.toISOString(),
    passagersAnonymized: stalePassagers.length,
    billetsAnonymized: staleBillets.length,
  }

  logger.info(summary, 'rgpd-retention cron completed')

  return Response.json({ ok: true, ...summary })
}

const ANONYMIZED_FIRSTNAME = 'RGPD'
const ANONYMIZED_NAME = 'ANONYMIZED'
