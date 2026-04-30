import { auth } from '@/lib/auth'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { AlertsBanner } from '@/components/alerts-banner'
import { ImpersonationBanner } from '@/components/impersonation-banner'
import { CalpaxWordmark } from '@/components/brand/calpax-wordmark'
import { runWithContext } from '@/lib/context'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { buildBallonAlerts, buildPiloteAlerts, sortAlerts } from '@/lib/regulatory/alerts'
import {
  IMPERSONATION_COOKIE_NAME,
  verifyImpersonationCookie,
} from '@/lib/auth/impersonation-cookie'
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
  const sessionExploitantId = user.exploitantId as string
  const role = (user.role as string as UserRole) ?? 'GERANT'
  const showAlerts = canSeeRegulatoryAlerts(role)

  // Two flavours of impersonation can be active simultaneously, but only one
  // wins for the layout banner — exploitant-level (cookie) takes precedence
  // since it changes the data we render on this very page.
  //
  // 1. Better Auth admin plugin → user-level: `session.session.impersonatedBy`
  // 2. ADMIN_CALPAX → exploitant cookie (#59): signed cookie carrying target
  //    exploitantId; honoured by `requireAuth` for downstream queries.
  const sessionMeta = (session as unknown as { session?: { impersonatedBy?: string | null } })
    .session
  const userImpersonatedBy = sessionMeta?.impersonatedBy ?? null

  let impersonationKind: 'user' | 'exploitant' | null = null
  let impersonationTargetName: string | null = null
  let exploitantId = sessionExploitantId

  if (role === 'ADMIN_CALPAX') {
    const cookieStore = await cookies()
    const claim = verifyImpersonationCookie(cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value)
    if (claim && claim.adminUserId === session.user.id) {
      impersonationKind = 'exploitant'
      // Name is snapshotted in the cookie at start time; may go stale within
      // the 4h TTL if the exploitant is renamed. Acceptable trade-off vs. a
      // cross-tenant DB hit on every page render.
      impersonationTargetName = claim.targetName
      exploitantId = claim.targetExploitantId
    }
  }

  if (!impersonationKind && userImpersonatedBy) {
    impersonationKind = 'user'
    impersonationTargetName = (user.name as string) ?? (user.email as string) ?? '?'
  }

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
        db.billet.count({ where: { statut: 'EN_ATTENTE' } }).catch((err: unknown) => {
          logger.warn({ err, exploitantId }, 'layout: pending billets count failed')
          return 0
        }),
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
        {impersonationKind && impersonationTargetName && (
          <ImpersonationBanner targetName={impersonationTargetName} kind={impersonationKind} />
        )}
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
