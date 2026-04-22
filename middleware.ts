import { NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { getSessionCookie } from 'better-auth/cookies'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

// Paths directly under /[locale]/ that must remain publicly accessible
// (kept as a prefix list — anything under /[locale]/auth/... is public)
const PUBLIC_PREFIXES = ['auth']

function isProtectedPath(pathname: string): boolean {
  // Match /[locale]/... where [locale] is a two-letter code.
  const match = pathname.match(/^\/([a-z]{2})(\/.*)?$/)
  if (!match) return false

  const rest = match[2] ?? '/'
  // Root /[locale] and /[locale]/ are protected (dashboard home lives in (app)/page.tsx)
  if (rest === '/' || rest === '') return true

  // First segment after the locale determines whether the path is public
  const firstSegment = rest.split('/')[1] ?? ''
  return !PUBLIC_PREFIXES.includes(firstSegment)
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isProtectedPath(pathname)) {
    // Optimistic cookie check — cheap edge-side guard only.
    // The authoritative validation happens server-side in requireAuth().
    // See: https://www.better-auth.com/docs/concepts/cookies#getsessioncookie
    const sessionCookie = getSessionCookie(request)
    if (!sessionCookie) {
      const locale = pathname.split('/')[1] || routing.defaultLocale
      const signinUrl = new URL(`/${locale}/auth/signin`, request.url)
      // Preserve the intended destination so we can redirect back after login.
      signinUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signinUrl)
    }
  }

  const response = intlMiddleware(request)

  if (isProtectedPath(pathname)) {
    // Protected routes may serve decrypted PII (poids passagers, coordonnées,
    // etc.) embedded in RSC payloads. Prevent any shared or browser cache
    // from retaining those bytes past the session.
    response.headers.set('Cache-Control', 'private, no-store')
  }

  return response
}

export const config = {
  // Match all pathnames except API, static assets, and files with extensions.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
