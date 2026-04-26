import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { magicLink } from 'better-auth/plugins/magic-link'
import { admin } from 'better-auth/plugins/admin'
import { twoFactor } from 'better-auth/plugins/two-factor'
import { basePrisma } from '@/lib/db/base'
import { authBeforeHook, authAfterHook } from '@/lib/auth/hooks'
import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
const resend =
  resendApiKey && resendApiKey !== 'resend-key-not-configured' ? new Resend(resendApiKey) : null

// Better Auth signs sessions, magic-link tokens, and TOTP secrets with this key.
// We require at least 32 bytes of entropy to keep HMAC-SHA256 outputs sound and
// to deter brute-force on encrypted blobs (TOTP secrets, backup codes).
function resolveAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'BETTER_AUTH_SECRET must be set to at least 32 characters in production. Generate one with `openssl rand -base64 32`.',
      )
    }
    console.warn(
      '[auth] BETTER_AUTH_SECRET is missing or shorter than 32 characters. This is unsafe outside local development.',
    )
  }
  return secret ?? ''
}

export const auth = betterAuth({
  secret: resolveAuthSecret(),
  baseURL:
    process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  trustedOrigins: ['https://calpax.fr', 'https://www.calpax.fr'],
  database: prismaAdapter(basePrisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    // Require email verification before a session can be created.
    // This only affects self-signup (public signup flow). Users created by an
    // admin via `createUserForExploitant` (lib/actions/admin.ts) have
    // `emailVerified: true` set directly in the DB — the admin vouches for them —
    // so they are not blocked by this flag.
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      if (!resend) {
        console.warn('[auth] Resend not configured, reset password URL:', url)
        return
      }
      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? 'Calpax <noreply@calpax.fr>',
        to: user.email,
        subject: 'Reinitialisation de votre mot de passe Calpax',
        html: `<p>Cliquez sur ce lien pour reinitialiser votre mot de passe :</p><p><a href="${url}">${url}</a></p><p>Ce lien expire dans 1 heure.</p>`,
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      if (!resend) {
        console.warn('[auth] Resend not configured, verification URL:', url)
        return
      }
      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? 'Calpax <noreply@calpax.fr>',
        to: user.email,
        subject: 'Verifiez votre adresse email Calpax',
        html: `<p>Bienvenue sur Calpax. Cliquez sur ce lien pour verifier votre adresse email :</p><p><a href="${url}">${url}</a></p><p>Ce lien expire dans 1 heure.</p>`,
      })
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
  account: {
    accountLinking: {
      // Enable manual account linking (from profile page).
      // Automatic linking on same email is NOT enabled -- we require an
      // authenticated user to explicitly link via `authClient.linkSocial`.
      enabled: true,
      trustedProviders: [],
      // Allow linking a social account with a different email than the user's
      // primary email. Safe here because linking is only initiated by an
      // already-authenticated user from the profile page.
      allowDifferentEmails: true,
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        if (!resend) {
          console.warn('[auth] Resend not configured, magic link URL:', url)
          return
        }
        await resend.emails.send({
          from: process.env.EMAIL_FROM ?? 'Calpax <noreply@calpax.fr>',
          to: email,
          subject: 'Connexion a Calpax',
          html: `<p>Cliquez sur ce lien pour vous connecter :</p><p><a href="${url}">${url}</a></p>`,
        })
      },
    }),
    admin(),
    // #15: TOTP 2FA via authenticator apps (Google Authenticator, 1Password…).
    // Backup codes are encrypted at rest; the TOTP secret is encrypted by
    // the plugin using BETTER_AUTH_SECRET. Setup + signin challenge are
    // wired in the profile page and /auth/two-factor respectively.
    twoFactor({
      issuer: 'Calpax',
      totpOptions: {
        period: 30,
        digits: 6,
      },
      backupCodeOptions: {
        amount: 10,
        length: 10,
        storeBackupCodes: 'encrypted',
      },
    }),
  ],
  // Request lifecycle hooks for audit logging + account lockout.
  // Defined in lib/auth/hooks.ts.
  hooks: {
    before: authBeforeHook,
    after: authAfterHook,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  user: {
    additionalFields: {
      exploitantId: {
        type: 'string',
        required: true,
        input: false,
      },
      role: {
        type: 'string',
        required: true,
        defaultValue: 'GERANT',
        input: false,
      },
    },
  },
})

export type Session = typeof auth.$Infer.Session
