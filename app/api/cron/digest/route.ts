import { basePrisma } from '@/lib/db/base'
import { buildBallonAlerts, buildPiloteAlerts, sortAlerts } from '@/lib/regulatory/alerts'
import { sendDigestEmail } from '@/lib/email/digest'
import { logger } from '@/lib/logger'

/**
 * Weekly digest cron endpoint.
 * Called by Vercel Cron every Monday at 07:00 UTC.
 * Requires Authorization: Bearer <CRON_SECRET> header.
 */
export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    logger.error('CRON_SECRET is not configured')
    return Response.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Unauthorized cron digest request')
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
