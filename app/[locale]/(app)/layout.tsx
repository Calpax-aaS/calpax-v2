import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

/**
 * Auth-guarded layout: redirects unauthenticated users to the sign-in page.
 */
export default async function AppLayout({ children, params }: Props) {
  const { locale } = await params
  const session = await auth()

  if (!session?.user) {
    redirect(`/${locale}/auth/signin`)
  }

  return <>{children}</>
}
