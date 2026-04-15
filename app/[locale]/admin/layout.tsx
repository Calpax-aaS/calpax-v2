import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AdminNav } from '@/components/admin-nav'

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

/**
 * Admin layout: requires ADMIN_CALPAX role.
 * Redirects unauthenticated users to sign-in.
 * Returns 403-style message for authenticated non-admin users.
 */
export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    redirect(`/${locale}/auth/signin`)
  }

  const user = session.user as Record<string, unknown>
  if (user.role !== 'ADMIN_CALPAX') {
    const t = await getTranslations('admin')
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-red-600">{t('unauthorized')}</p>
      </main>
    )
  }

  return (
    <div className="flex min-h-screen">
      <AdminNav locale={locale} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
