import { createAuthClient } from 'better-auth/client'
import { magicLinkClient } from 'better-auth/client/plugins'
import { adminClient } from 'better-auth/client/plugins'
import { twoFactorClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL:
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  plugins: [
    magicLinkClient(),
    adminClient(),
    twoFactorClient({
      // Redirect the user to this page whenever signIn.email returns the
      // 2FA-required flag. The page drives the TOTP / backup-code challenge.
      onTwoFactorRedirect: () => {
        if (typeof window !== 'undefined') {
          const locale = window.location.pathname.split('/')[1] || 'fr'
          window.location.href = `/${locale}/auth/two-factor`
        }
      },
    }),
  ],
})

export const { signIn, signOut, signUp, useSession } = authClient
