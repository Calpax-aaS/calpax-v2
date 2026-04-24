import { basePrisma } from '@/lib/db/base'
import { buildBallonAlerts, buildPiloteAlerts, sortAlerts } from '@/lib/regulatory/alerts'
import { sendDigestEmail } from '@/lib/email/digest'
import { verifyCronRequest } from '@/lib/auth/cron'
import { logger } from '@/lib/logger'

// 6 day cooldown: weekly schedule in vercel.json (Mon 07:00 UTC).
const MIN_INTERVAL_MS = 6 * 24 * 60 * 60 * 1000

/**
 * Weekly digest cron endpoint.
 * Called by Vercel Cron every Monday at 07:00 UTC.
 * Requires Authorization: Bearer <CRON_SECRET> header + per-endpoint cooldown.
 */
export async function GET(request: Request): Promise<Response> {
  const guard = await verifyCronRequest(request, 'digest', { minIntervalMs: MIN_INTERVAL_MS })
  if (!guard.ok) return guard.response

  const today = new Date()

  const exploitants = await basePrisma.exploitant.findMany({
    where: { frDecNumber: { not: 'INTERNAL.CALPAX' } },
    select: {
      id: true,
      name: true,
      ballons: {
        where: { actif: true },
        select: { id: true, immatriculation: true, camoExpiryDate: true, actif: true },
      },
      pilotes: {
        where: { actif: true },
        select: {
          id: true,
          prenom: true,
          nom: true,
          dateExpirationLicence: true,
          actif: true,
        },
      },
      users: {
        where: { role: 'GERANT' },
        select: { email: true },
      },
    },
  })

  let sent = 0
  let skipped = 0

  for (const exploitant of exploitants) {
    const ballonAlerts = buildBallonAlerts(exploitant.ballons, today)
    const piloteAlerts = buildPiloteAlerts(exploitant.pilotes, today)
    const alerts = sortAlerts([...ballonAlerts, ...piloteAlerts])

    if (alerts.length === 0) {
      skipped++
      continue
    }

    const recipients = exploitant.users.map((u) => u.email).filter(Boolean)

    if (recipients.length === 0) {
      logger.warn({ exploitantId: exploitant.id }, 'No GERANT emails found — skipping digest')
      skipped++
      continue
    }

    try {
      await sendDigestEmail(recipients, exploitant.name, alerts)
      logger.info(
        { exploitantId: exploitant.id, alertCount: alerts.length, recipients: recipients.length },
        'Digest sent',
      )
      sent++
    } catch (err) {
      logger.error({ exploitantId: exploitant.id, err }, 'Failed to send digest email')
    }
  }

  logger.info({ sent, skipped }, 'Cron digest complete')
  return Response.json({ sent, skipped })
}
