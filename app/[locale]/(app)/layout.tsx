import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

/**
 * Auth-guarded layout: redirects unauthenticated users to the sign-in page.
 * Wraps authenticated children in the sidebar shell.
 */
export default async function AppLayout({ children, params }: Props) {
  const { locale } = await params
  const session = await auth()

  if (!session?.user) {
    redirect(`/${locale}/auth/signin`)
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
