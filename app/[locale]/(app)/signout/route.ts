import { auth } from '@/lib/auth'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  // Revoke the session server-side
  const session = await auth.api.getSession({ headers: req.headers })
  if (session) {
    await auth.api.signOut({ headers: req.headers })
  }

  return NextResponse.redirect(new URL(`/${locale}/auth/signin`, req.url))
}
