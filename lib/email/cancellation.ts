import { Resend } from 'resend'
import { formatDateFr } from '@/lib/format'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

type CancellationData = {
  ballonNom: string
  date: Date
  creneau: 'MATIN' | 'SOIR'
  exploitantName: string
  reason: string
}

function buildPayeurHtml(data: CancellationData): string {
  const dateStr = formatDateFr(data.date)
  const creneauLabel = data.creneau === 'MATIN' ? 'matin' : 'soir'
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/><title>Vol annule</title></head>
<body style="font-family:Arial,sans-serif;color:#111827;background:#f9fafb;margin:0;padding:24px;">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;">
  <div style="background:#b45309;color:#fff;padding:20px 24px;">
    <h1 style="margin:0;font-size:18px;">Vol annule — ${escapeHtml(data.exploitantName)}</h1>
  </div>
  <div style="padding:24px;">
    <p>Bonjour,</p>
    <p>Nous vous informons que votre vol du <strong>${dateStr}</strong> (creneau ${creneauLabel})
       a ete annule pour raison <strong>${escapeHtml(data.reason)}</strong>.</p>
    <p>Nous vous recontacterons pour reprogrammer votre vol dans les meilleurs delais.</p>
    <p style="margin-top:24px;font-size:12px;color:#6b7280;">
      ${escapeHtml(data.exploitantName)} — Calpax
    </p>
  </div>
</div></body></html>`
}

function buildEquipeHtml(data: CancellationData): string {
  const dateStr = formatDateFr(data.date)
  const creneauLabel = data.creneau === 'MATIN' ? 'matin' : 'soir'
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/><title>Vol annule</title></head>
<body style="font-family:Arial,sans-serif;color:#111827;background:#f9fafb;margin:0;padding:24px;">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;">
  <div style="background:#b45309;color:#fff;padding:20px 24px;">
    <h1 style="margin:0;font-size:18px;">Vol annule</h1>
  </div>
  <div style="padding:24px;">
    <p>Bonjour,</p>
    <p>Le vol <strong>${escapeHtml(data.ballonNom)}</strong> du <strong>${dateStr}</strong>
       (creneau ${creneauLabel}) a ete annule.</p>
    <p>Raison : ${escapeHtml(data.reason)}</p>
    <p style="margin-top:24px;font-size:12px;color:#6b7280;">
      ${escapeHtml(data.exploitantName)} — Calpax
    </p>
  </div>
</div></body></html>`
}

type SendCancellationParams = {
  payeurEmails: string[]
  piloteEmail: string | null
  equipierEmail: string | null
  cancellingUserId: string
  piloteUserId: string | null
  data: CancellationData
}

export async function sendCancellationEmails(params: SendCancellationParams): Promise<{
  sent: number
  skipped: number
}> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[cancellation] Resend not configured — skipping emails')
    return { sent: 0, skipped: 0 }
  }

  const resend = new Resend(apiKey)
  const from = process.env.EMAIL_FROM ?? 'Calpax <noreply@calpax.fr>'
  const dateStr = formatDateFr(params.data.date)
  let sent = 0
  let skipped = 0

  for (const email of params.payeurEmails) {
    try {
      await resend.emails.send({
        from,
        to: email,
        subject: `Vol annule — ${dateStr}`,
        html: buildPayeurHtml(params.data),
      })
      sent++
    } catch {
      skipped++
    }
  }

  if (params.piloteEmail && params.piloteUserId !== params.cancellingUserId) {
    try {
      await resend.emails.send({
        from,
        to: params.piloteEmail,
        subject: `Vol annule — ${params.data.ballonNom} — ${dateStr}`,
        html: buildEquipeHtml(params.data),
      })
      sent++
    } catch {
      skipped++
    }
  }

  if (params.equipierEmail) {
    try {
      await resend.emails.send({
        from,
        to: params.equipierEmail,
        subject: `Vol annule — ${params.data.ballonNom} — ${dateStr}`,
        html: buildEquipeHtml(params.data),
      })
      sent++
    } catch {
      skipped++
    }
  }

  return { sent, skipped }
}
