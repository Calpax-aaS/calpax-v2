import { Resend } from 'resend'
import { randomBytes } from 'node:crypto'
import { basePrisma } from '@/lib/db/base'

// Token expiry for invitation links: 24h (vs. 1h for standard password reset)
const INVITATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

// Alphabet must match Better Auth's default token format ([a-zA-Z0-9])
// so the verification row we create is indistinguishable from a native one.
const TOKEN_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const TOKEN_LENGTH = 24

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Generate a URL-safe random token compatible with Better Auth's format.
 * Uses rejection sampling to avoid modulo bias.
 */
function generateInvitationToken(): string {
  const charsetLength = TOKEN_ALPHABET.length
  const maxValid = Math.floor(256 / charsetLength) * charsetLength
  let result = ''
  while (result.length < TOKEN_LENGTH) {
    const buf = randomBytes(TOKEN_LENGTH * 2)
    for (let i = 0; i < buf.length && result.length < TOKEN_LENGTH; i++) {
      const byte = buf[i]
      if (byte === undefined || byte >= maxValid) continue
      const char = TOKEN_ALPHABET[byte % charsetLength]
      if (char !== undefined) result += char
    }
  }
  return result
}

function getBaseUrl(): string {
  return process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

function buildInvitationEmailHtml(params: {
  userName: string
  exploitantName: string
  resetUrl: string
}): string {
  const { userName, exploitantName, resetUrl } = params
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Bienvenue sur Calpax</title>
</head>
<body style="font-family: Arial, sans-serif; color: #111827; background: #f9fafb; margin: 0; padding: 24px;">
  <div style="max-width: 640px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: #1e40af; color: #fff; padding: 20px 24px;">
      <h1 style="margin: 0; font-size: 20px;">Bienvenue sur Calpax</h1>
    </div>
    <div style="padding: 24px;">
      <p style="margin: 0 0 16px;">Bonjour ${escapeHtml(userName)},</p>
      <p style="margin: 0 0 16px;">
        Un compte Calpax vient d'etre cree pour vous${
          exploitantName
            ? ` au sein de l'exploitation <strong>${escapeHtml(exploitantName)}</strong>`
            : ''
        }.
      </p>
      <p style="margin: 0 0 24px;">
        Pour finaliser votre inscription, definissez votre mot de passe en cliquant sur le bouton ci-dessous.
        Ce lien est valide pendant 24 heures.
      </p>
      <p style="margin: 0 0 24px; text-align: center;">
        <a href="${resetUrl}"
           style="display: inline-block; background: #1e40af; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Definir mon mot de passe
        </a>
      </p>
      <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">
        Si le bouton ne fonctionne pas, copiez cette URL dans votre navigateur :
      </p>
      <p style="margin: 0 0 24px; font-size: 13px; color: #6b7280; word-break: break-all;">
        ${escapeHtml(resetUrl)}
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        Vous recevez cet email parce qu'un administrateur a cree un compte Calpax pour cette adresse.
        Si vous n'etes pas a l'origine de cette demande, vous pouvez ignorer ce message.
      </p>
    </div>
  </div>
</body>
</html>`
}

function buildInvitationEmailText(params: {
  userName: string
  exploitantName: string
  resetUrl: string
}): string {
  const { userName, exploitantName, resetUrl } = params
  return `Bonjour ${userName},

Un compte Calpax vient d'etre cree pour vous${
    exploitantName ? ` au sein de l'exploitation ${exploitantName}` : ''
  }.

Pour finaliser votre inscription, definissez votre mot de passe en ouvrant ce lien (valide 24h) :
${resetUrl}

Si vous n'etes pas a l'origine de cette demande, vous pouvez ignorer ce message.
`
}

export type SendInvitationEmailResult = {
  sent: boolean
  reason?: 'resend-not-configured' | 'error'
}

/**
 * Create a password-reset verification row for a newly invited user and send
 * a welcome email (rather than the standard "password reset" email).
 *
 * This mirrors Better Auth's internal `requestPasswordReset` flow:
 *   - identifier: `reset-password:<token>` (raw token, not hashed)
 *   - value:      user id
 *   - expiresAt:  now + 24h (longer than reset default to accommodate new users)
 *
 * The generated URL points to Better Auth's `/api/auth/reset-password/:token`
 * endpoint, which validates the token and redirects to the app's reset-password
 * page with `?invitation=1` so the UI can show welcome copy.
 */
export async function sendInvitationEmail(params: {
  userId: string
  email: string
  name: string
  exploitantName: string
}): Promise<SendInvitationEmailResult> {
  const { userId, email, name, exploitantName } = params

  const token = generateInvitationToken()
  const expiresAt = new Date(Date.now() + INVITATION_TOKEN_TTL_MS)

  await basePrisma.verification.create({
    data: {
      identifier: `reset-password:${token}`,
      value: userId,
      expiresAt,
    },
  })

  const baseUrl = getBaseUrl()
  // Relative callbackURL is allowed by Better Auth's trusted-origin check
  // (see `isTrustedOrigin(url, { allowRelativePaths: true })`).
  const callbackUrl = '/auth/reset-password?invitation=1'
  const resetUrl = `${baseUrl}/api/auth/reset-password/${token}?callbackURL=${encodeURIComponent(
    callbackUrl,
  )}`

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey || resendApiKey === 'resend-key-not-configured') {
    console.warn('[invitation] Resend not configured, invitation URL:', resetUrl)
    return { sent: false, reason: 'resend-not-configured' }
  }

  const resend = new Resend(resendApiKey)
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'Calpax <noreply@calpax.fr>',
      to: email,
      subject: 'Bienvenue sur Calpax - Definissez votre mot de passe',
      html: buildInvitationEmailHtml({ userName: name, exploitantName, resetUrl }),
      text: buildInvitationEmailText({ userName: name, exploitantName, resetUrl }),
    })
    return { sent: true }
  } catch (err) {
    console.warn('[invitation] Failed to send invitation email', err)
    return { sent: false, reason: 'error' }
  }
}
