import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { WeekGrid } from '@/components/week-grid'
import type { VolSummary } from '@/components/week-grid'
import { FlightCard } from '@/components/flight-card'
import type { FlightCardData } from '@/components/flight-card'
import { buildVolWhereForRole } from '@/lib/vol/role-filter'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ week?: string }>
}

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7)) // shift to Monday
  return d.toISOString().slice(0, 10)
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function mapVolToCardData(vol: {
  id: string
  date: Date
  creneau: string
  statut: string
  ballon: { nom: string; immatriculation: string; nbPassagerMax: number }
  pilote: { prenom: string; nom: string }
  equipierEntity: { prenom: string; nom: string } | null
  equipierAutre: string | null
  siteDecollageEntity: { nom: string } | null
  lieuDecollageAutre: string | null
  _count: { passagers: number }
}): FlightCardData {
  const equipierNom = vol.equipierEntity
    ? `${vol.equipierEntity.prenom} ${vol.equipierEntity.nom}`
    : (vol.equipierAutre ?? null)

  const siteDeco = vol.siteDecollageEntity?.nom ?? vol.lieuDecollageAutre ?? null

  return {
    id: vol.id,
    date: toDateOnly(vol.date),
    creneau: vol.creneau as 'MATIN' | 'SOIR',
    statut: vol.statut,
    ballonNom: vol.ballon.nom,
    ballonImmat: vol.ballon.immatriculation,
    piloteNom: `${vol.pilote.prenom} ${vol.pilote.nom}`,
    equipierNom,
    siteDeco,
    passagerCount: vol._count.passagers,
    passagerMax: vol.ballon.nbPassagerMax,
    massBudget: null,
    weather: null,
    meteoAlert: false,
  }
}

export default async function VolsPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { week } = await searchParams

  return requireAuth(async () => {
    const t = await getTranslations('vols')
    const ctx = getContext()

    // Determine week start (Monday) — all date math in UTC to avoid timezone drift
    const todayStr = toDateOnly(new Date())
    const weekStartStr = getMondayOfWeek(week ?? todayStr)

    // Week end: Sunday
    const weekStartDate = new Date(weekStartStr + 'T00:00:00Z')
    const weekEndDate = new Date(weekStartStr + 'T00:00:00Z')
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6)

    const baseWhere = {
      exploitantId: ctx.exploitantId,
      date: {
        gte: weekStartDate,
        lte: weekEndDate,
      },
    }

    const where = buildVolWhereForRole(baseWhere, ctx.role, ctx.userId)

    const volsRaw = await db.vol.findMany({
      where,
      include: {
        ballon: { select: { nom: true, immatriculation: true, nbPassagerMax: true } },
        pilote: { select: { prenom: true, nom: true } },
        equipierEntity: { select: { prenom: true, nom: true } },
        siteDecollageEntity: { select: { nom: true } },
        _count: { select: { passagers: true } },
      },
      orderBy: { date: 'asc' },
    })

    const weekVols: VolSummary[] = volsRaw.map((vol) => ({
      id: vol.id,
      date: toDateOnly(vol.date),
      creneau: vol.creneau as 'MATIN' | 'SOIR',
      ballonNom: vol.ballon.nom,
      piloteInitiales:
        (vol.pilote.prenom[0] ?? '').toUpperCase() + (vol.pilote.nom[0] ?? '').toUpperCase(),
      passagerCount: vol._count.passagers,
      nbPassagerMax: vol.ballon.nbPassagerMax,
      statut: vol.statut,
    }))

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <Link
            href={`/${locale}/vols/create`}
            className={cn(buttonVariants({ variant: 'default' }))}
          >
            {t('new')}
          </Link>
        </div>

        {/* Mobile: stacked flight cards */}
        <div className="md:hidden space-y-3">
          {volsRaw.map((vol) => (
            <FlightCard key={vol.id} flight={mapVolToCardData(vol)} locale={locale} />
          ))}
          {volsRaw.length === 0 && (
            <p className="text-center text-muted-foreground py-8">{t('noVols')}</p>
          )}
        </div>

        {/* Desktop: week grid */}
        <div className="hidden md:block">
          <Card>
            <CardContent className="p-4">
              <WeekGrid
                weekStart={weekStartStr}
                vols={weekVols}
                locale={locale}
                todayMonday={getMondayOfWeek(todayStr)}
                emptyActionLabel={t('createFirst')}
                emptyActionHref={`/${locale}/vols/create`}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  })
}
