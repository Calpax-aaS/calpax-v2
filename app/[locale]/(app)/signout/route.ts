import { signOut } from '@/lib/auth'
import { type NextRequest } from 'next/server'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  await signOut({
    redirectTo: `/${locale}/auth/signin`,
  })
}
