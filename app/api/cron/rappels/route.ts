import { basePrisma } from '@/lib/db/base'
import { sendRappelEmail } from '@/lib/email/rappels'
import { verifyCronRequest } from '@/lib/auth/cron'
import { logger } from '@/lib/logger'

// 20 hour cooldown: daily schedule in vercel.json (07:00 UTC). Slightly under
// 24h to give Vercel some scheduling tolerance.
const MIN_INTERVAL_MS = 20 * 60 * 60 * 1000

/**
 * Daily billet reminder cron endpoint.
 * Called by Vercel Cron every day at 07:00 UTC.
 * Requires Authorization: Bearer <CRON_SECRET> header + per-endpoint cooldown.
 */
export async function GET(request: Request): Promise<Response> {
  const guard = await verifyCronRequest(request, 'rappels', { minIntervalMs: MIN_INTERVAL_MS })
  if (!guard.ok) return guard.response

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const billets = await basePrisma.billet.findMany({
    where: {
      dateRappel: { gte: today, lt: tomorrow },
      statut: { in: ['EN_ATTENTE', 'PLANIFIE'] },
    },
    include: {
      exploitant: { select: { id: true, name: true, email: true } },
    },
  })

  type BilletWithExploitant = (typeof billets)[number]

  const grouped = new Map<
    string,
    { exploitant: { name: string; email: string | null }; billets: BilletWithExploitant[] }
  >()

  for (const billet of billets) {
    const key = billet.exploitantId
    if (!grouped.has(key)) {
      grouped.set(key, { exploitant: billet.exploitant, billets: [] })
    }
    grouped.get(key)!.billets.push(billet)
  }

  let sent = 0
  let skipped = 0

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://calpax.fr'

  for (const [, { exploitant, billets: expBillets }] of grouped) {
    const email = exploitant.email
    if (!email) {
      logger.warn({ exploitantName: exploitant.name }, 'No email on exploitant — skipping rappels')
      skipped++
      continue
    }

    try {
      await sendRappelEmail(
        [email],
        exploitant.name,
        expBillets.map((b) => ({
          reference: b.reference,
          payeurNom: b.payeurNom,
          payeurPrenom: b.payeurPrenom,
          payeurTelephone: b.payeurTelephone,
          commentaire: b.commentaire,
          billetUrl: `${baseUrl}/fr/billets/${b.id}`,
        })),
      )
      logger.info(
        { exploitantName: exploitant.name, billetCount: expBillets.length },
        'Rappels email sent',
      )
      sent++
    } catch (err) {
      logger.error({ exploitantName: exploitant.name, err }, 'Failed to send rappels email')
    }
  }

  logger.info({ sent, skipped }, 'Cron rappels complete')
  return Response.json({ sent, skipped })
}
