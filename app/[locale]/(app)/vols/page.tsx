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

    const volsRaw = await db.vol.findMany({
      where: {
        exploitantId: ctx.exploitantId,
        date: {
          gte: weekStartDate,
          lte: weekEndDate,
        },
      },
      include: {
        ballon: { select: { nom: true, nbPassagerMax: true } },
        pilote: { select: { prenom: true, nom: true } },
        _count: { select: { passagers: true } },
      },
      orderBy: { date: 'asc' },
    })

    const vols: VolSummary[] = volsRaw.map((vol) => ({
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

        <Card>
          <CardContent className="p-4">
            <WeekGrid
              weekStart={weekStartStr}
              vols={vols}
              locale={locale}
              todayMonday={getMondayOfWeek(todayStr)}
            />
          </CardContent>
        </Card>
      </div>
    )
  })
}
