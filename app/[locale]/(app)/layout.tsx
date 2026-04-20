import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { AlertsBanner } from '@/components/alerts-banner'
import { CalpaxWordmark } from '@/components/brand/calpax-wordmark'
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

  const { alerts, exploitantName, pendingTicketsCount } = await runWithContext(
    {
      userId: session.user.id,
      exploitantId,
      role,
    },
    async () => {
      const today = new Date()
      const [ballons, pilotes, exploitant, ticketsCount] = await Promise.all([
        db.ballon.findMany({
          where: { actif: true },
          select: { id: true, nom: true, immatriculation: true, camoExpiryDate: true, actif: true },
        }),
        db.pilote.findMany({
          where: { actif: true },
          select: { id: true, prenom: true, nom: true, dateExpirationLicence: true, actif: true },
        }),
        db.exploitant.findFirst({ select: { name: true } }),
        db.billet.count({ where: { statut: 'EN_ATTENTE' } }).catch(() => 0),
      ])
      const sorted = sortAlerts([
        ...buildBallonAlerts(ballons, today),
        ...buildPiloteAlerts(pilotes, today),
      ])
      return {
        alerts: sorted,
        exploitantName: exploitant?.name ?? null,
        pendingTicketsCount: ticketsCount,
      }
    },
  )

  const criticalAlerts = alerts.filter((a) => a.severity === 'EXPIRED' || a.severity === 'CRITICAL')

  return (
    <SidebarProvider>
      <AppSidebar
        userRole={role}
        exploitantName={exploitantName}
        pendingTicketsCount={pendingTicketsCount}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-sky-100 bg-card px-4 md:hidden">
          <SidebarTrigger />
          <CalpaxWordmark size={14} />
        </header>
        <AlertsBanner alerts={criticalAlerts} />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
