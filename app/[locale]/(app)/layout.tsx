import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { AlertsBanner } from '@/components/alerts-banner'
import { ImpersonationBanner } from '@/components/impersonation-banner'
import { CalpaxWordmark } from '@/components/brand/calpax-wordmark'
import { runWithContext } from '@/lib/context'
import { db } from '@/lib/db'
import { buildBallonAlerts, buildPiloteAlerts, sortAlerts } from '@/lib/regulatory/alerts'
import type { Alert } from '@/lib/regulatory/alerts'
import type { UserRole } from '@/lib/context'

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

/**
 * Regulatory alerts (CAMO / BFCL) are operational — only roles that can act on
 * them get the top-bar banner. PILOTE and EQUIPIER are intentionally excluded
 * (they can't edit ballons / pilotes anyway) and we skip the corresponding DB
 * query for them.
 */
function canSeeRegulatoryAlerts(role: UserRole): boolean {
  return role === 'ADMIN_CALPAX' || role === 'GERANT'
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
  const showAlerts = canSeeRegulatoryAlerts(role)

  // Better Auth's admin plugin sets `session.session.impersonatedBy` when an
  // ADMIN_CALPAX is impersonating another user. We show the banner on every
  // page so the admin can't lose track of their operating context.
  const sessionMeta = (session as unknown as { session?: { impersonatedBy?: string | null } })
    .session
  const impersonatedBy = sessionMeta?.impersonatedBy ?? null
  const impersonationTargetName = impersonatedBy
    ? ((user.name as string) ?? (user.email as string) ?? '?')
    : null

  const { criticalAlerts, exploitantName, pendingTicketsCount } = await runWithContext(
    {
      userId: session.user.id,
      exploitantId,
      role,
    },
    async () => {
      const today = new Date()
      const [exploitant, ticketsCount, alerts] = await Promise.all([
        db.exploitant.findFirst({ select: { name: true } }),
        db.billet.count({ where: { statut: 'EN_ATTENTE' } }).catch(() => 0),
        showAlerts ? fetchCriticalAlerts(today) : Promise.resolve<Alert[]>([]),
      ])
      return {
        criticalAlerts: alerts,
        exploitantName: exploitant?.name ?? null,
        pendingTicketsCount: ticketsCount,
      }
    },
  )

  return (
    <SidebarProvider>
      <AppSidebar
        userRole={role}
        exploitantName={exploitantName}
        pendingTicketsCount={pendingTicketsCount}
      />
      <SidebarInset>
        {impersonationTargetName && <ImpersonationBanner targetName={impersonationTargetName} />}
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

async function fetchCriticalAlerts(today: Date): Promise<Alert[]> {
  const [ballons, pilotes] = await Promise.all([
    db.ballon.findMany({
      where: { actif: true },
      select: { id: true, nom: true, immatriculation: true, camoExpiryDate: true, actif: true },
    }),
    db.pilote.findMany({
      where: { actif: true },
      select: { id: true, prenom: true, nom: true, dateExpirationLicence: true, actif: true },
    }),
  ])
  const sorted = sortAlerts([
    ...buildBallonAlerts(ballons, today),
    ...buildPiloteAlerts(pilotes, today),
  ])
  return sorted.filter((a) => a.severity === 'EXPIRED' || a.severity === 'CRITICAL')
}
