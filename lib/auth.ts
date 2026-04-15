import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { magicLink } from 'better-auth/plugins/magic-link'
import { admin } from 'better-auth/plugins/admin'
import { basePrisma } from '@/lib/db/base'
import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
const resend =
  resendApiKey && resendApiKey !== 'resend-key-not-configured' ? new Resend(resendApiKey) : null

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET,
  baseURL:
    process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  database: prismaAdapter(basePrisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
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
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
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
  ],
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
