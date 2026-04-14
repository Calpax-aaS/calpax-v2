import { Resend } from 'resend'
import type { Alert } from '@/lib/regulatory/alerts'
import { formatDateFr } from '@/lib/format'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const SEVERITY_COLOR: Record<string, string> = {
  EXPIRED: '#b91c1c',
  CRITICAL: '#c2410c',
  WARNING: '#a16207',
}

function formatDaysRemaining(daysRemaining: number): string {
  if (daysRemaining <= 0) return 'EXPIRE'
  return `${daysRemaining}j`
}

function buildAlertRow(alert: Alert): string {
  const certType = alert.alertType === 'CAMO_EXPIRY' ? 'CAMO' : 'BFCL'
  const color = SEVERITY_COLOR[alert.severity] ?? '#374151'
  const days = formatDaysRemaining(alert.daysRemaining)

  return `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(alert.entityName)}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${certType}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${formatDateFr(alert.expiryDate)}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: ${color}; font-weight: 600;">${days}</td>
    </tr>`
}

function buildEmailHtml(exploitantName: string, alerts: Alert[], weekLabel: string): string {
  const rows = alerts.map(buildAlertRow).join('')
  const n = alerts.length

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Digest alertes navigabilite</title>
</head>
<body style="font-family: Arial, sans-serif; color: #111827; background: #f9fafb; margin: 0; padding: 24px;">
  <div style="max-width: 640px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: #1e40af; color: #fff; padding: 20px 24px;">
      <h1 style="margin: 0; font-size: 18px;">Calpax — Digest navigabilite</h1>
      <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.85;">${escapeHtml(exploitantName)} &middot; ${weekLabel}</p>
    </div>
    <div style="padding: 24px;">
      <p style="margin: 0 0 16px;">${n} alerte${n > 1 ? 's' : ''} de navigabilite requiert${n > 1 ? 'ent' : ''} votre attention.</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background: #f3f4f6; text-align: left;">
            <th style="padding: 8px 12px; border-bottom: 2px solid #d1d5db;">Entite</th>
            <th style="padding: 8px 12px; border-bottom: 2px solid #d1d5db;">Certificat</th>
            <th style="padding: 8px 12px; border-bottom: 2px solid #d1d5db;">Expiration</th>
            <th style="padding: 8px 12px; border-bottom: 2px solid #d1d5db;">Statut</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin: 20px 0 0; font-size: 12px; color: #6b7280;">
        Cet email est genere automatiquement par Calpax. Ne pas repondre a ce message.
      </p>
    </div>
  </div>
</body>
</html>`
}

/**
 * Send the weekly navigability digest email to the given recipients.
 */
export async function sendDigestEmail(
  to: string[],
  exploitantName: string,
  alerts: Alert[],
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  const from = process.env.EMAIL_FROM ?? 'no-reply@calpax.fr'
  const resend = new Resend(apiKey)

  const today = new Date()
  const weekLabel = `semaine du ${formatDateFr(today)}`
  const n = alerts.length
  const subject = `[Calpax] ${n} alerte${n > 1 ? 's' : ''} navigabilite \u2014 ${weekLabel}`

  const html = buildEmailHtml(exploitantName, alerts, weekLabel)

  await resend.emails.send({ from, to, subject, html })
}
