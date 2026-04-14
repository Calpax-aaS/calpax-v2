import { Resend } from 'resend'
import { formatDateFr } from '@/lib/format'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

type BilletRappel = {
  reference: string
  payeurNom: string
  payeurPrenom: string
  payeurTelephone: string | null
  commentaire: string | null
  billetUrl: string
}

function buildRow(b: BilletRappel): string {
  return `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">
        <a href="${b.billetUrl}" style="color: #2563eb;">${b.reference}</a>
      </td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(b.payeurPrenom)} ${escapeHtml(b.payeurNom)}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(b.payeurTelephone ?? '—')}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(b.commentaire ?? '')}</td>
    </tr>`
}

function buildEmailHtml(
  exploitantName: string,
  billets: BilletRappel[],
  dateLabel: string,
): string {
  const rows = billets.map(buildRow).join('')
  const n = billets.length

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Rappels billets</title>
</head>
<body style="font-family: Arial, sans-serif; color: #111827; background: #f9fafb; margin: 0; padding: 24px;">
  <div style="max-width: 640px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: #1e40af; color: #fff; padding: 20px 24px;">
      <h1 style="margin: 0; font-size: 18px;">Calpax — Rappels billets</h1>
      <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.85;">${escapeHtml(exploitantName)} &middot; ${dateLabel}</p>
    </div>
    <div style="padding: 24px;">
      <p style="margin: 0 0 16px;">${n} billet${n > 1 ? 's' : ''} a recontacter aujourd'hui.</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background: #f3f4f6; text-align: left;">
            <th style="padding: 8px 12px; border-bottom: 2px solid #d1d5db;">Reference</th>
            <th style="padding: 8px 12px; border-bottom: 2px solid #d1d5db;">Payeur</th>
            <th style="padding: 8px 12px; border-bottom: 2px solid #d1d5db;">Telephone</th>
            <th style="padding: 8px 12px; border-bottom: 2px solid #d1d5db;">Commentaire</th>
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
 * Send the daily billet reminder email to the given recipients.
 */
export async function sendRappelEmail(
  to: string[],
  exploitantName: string,
  billets: BilletRappel[],
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  const from = process.env.EMAIL_FROM ?? 'no-reply@calpax.fr'
  const resend = new Resend(apiKey)

  const today = new Date()
  const dateLabel = formatDateFr(today)
  const n = billets.length
  const subject = `[Calpax] ${n} billet${n > 1 ? 's' : ''} a recontacter \u2014 ${dateLabel}`

  const html = buildEmailHtml(exploitantName, billets, dateLabel)

  await resend.emails.send({ from, to, subject, html })
}
