import NextAuth from 'next-auth'
import Resend from 'next-auth/providers/resend'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { basePrisma } from '@/lib/db/base'
import type { UserRole } from '@/lib/context'

/**
 * Extend the next-auth Session type to include exploitantId and role.
 * The User record is stored in DB via PrismaAdapter; we fetch these
 * fields from the DB user in the session callback.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      image: string | null
      exploitantId: string
      role: UserRole
    }
  }
}

const resendApiKey = process.env.RESEND_API_KEY

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(basePrisma),

  providers: [
    // Resend email magic-link provider.
    // If RESEND_API_KEY is missing (local dev without Resend), the provider
    // is still registered but sending will fail at runtime — acceptable for
    // local development where DATABASE_URL is all that matters.
    Resend({
      apiKey: resendApiKey ?? 'resend-key-not-configured',
      from: process.env.EMAIL_FROM ?? 'no-reply@calpax.fr',
    }),
  ],

  session: {
    strategy: 'database',
  },

  pages: {
    signIn: '/fr/auth/signin',
    verifyRequest: '/fr/auth/verify',
  },

  callbacks: {
    async session({ session, user }) {
      // user is available when using database sessions with an adapter
      const dbUser = await basePrisma.user.findFirst({
        where: { id: user.id },
        select: { exploitantId: true, role: true },
      })

      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          exploitantId: dbUser?.exploitantId ?? '',
          role: (dbUser?.role as UserRole) ?? '',
        },
      }
    },
  },
})
