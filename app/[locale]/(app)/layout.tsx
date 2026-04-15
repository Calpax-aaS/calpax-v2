import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { AlertsBanner } from '@/components/alerts-banner'
import { runWithContext } from '@/lib/context'
import { db } from '@/lib/db'
import { buildBallonAlerts, buildPiloteAlerts, sortAlerts } from '@/lib/regulatory/alerts'
import type { UserRole } from '@/lib/context'

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function AppLayout({ children, params }: Props) {
  const { locale } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    redirect(`/${locale}/auth/signin`)
  }

  const user = session.user as Record<string, unknown>
  const exploitantId = user.exploitantId as string
  const role = (user.role as string as UserRole) ?? 'GERANT'

  // Fetch alert count for sidebar badge
  const alerts = await runWithContext(
    {
      userId: session.user.id,
      exploitantId,
      role,
    },
    async () => {
      const today = new Date()
      const [ballons, pilotes] = await Promise.all([
        db.ballon.findMany({
          where: { actif: true },
          select: { id: true, immatriculation: true, camoExpiryDate: true, actif: true },
        }),
        db.pilote.findMany({
          where: { actif: true },
          select: { id: true, prenom: true, nom: true, dateExpirationLicence: true, actif: true },
        }),
      ])
      return sortAlerts([
        ...buildBallonAlerts(ballons, today),
        ...buildPiloteAlerts(pilotes, today),
      ])
    },
  )

  const criticalAlerts = alerts.filter((a) => a.severity === 'EXPIRED' || a.severity === 'CRITICAL')

  return (
    <SidebarProvider>
      <AppSidebar userRole={role} />
      <SidebarInset>
        <AlertsBanner alerts={criticalAlerts} />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
