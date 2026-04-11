import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { WeekGrid } from '@/components/week-grid'
import type { VolSummary } from '@/components/week-grid'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ week?: string }>
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export default async function VolsPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { week } = await searchParams

  return requireAuth(async () => {
    const t = await getTranslations('vols')
    const ctx = getContext()

    // Determine week start (Monday)
    const referenceDate = week ? new Date(week + 'T00:00:00') : new Date()
    const weekStart = getMondayOfWeek(referenceDate)

    // Week end: Sunday at 23:59:59
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const weekStartStr = toDateString(weekStart)

    const volsRaw = await db.vol.findMany({
      where: {
        exploitantId: ctx.exploitantId,
        date: {
          gte: weekStart,
          lte: weekEnd,
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
      date: toDateString(vol.date),
      creneau: vol.creneau as 'MATIN' | 'SOIR',
      ballonNom: vol.ballon.nom,
      piloteInitiales:
        (vol.pilote.prenom[0] ?? '').toUpperCase() + (vol.pilote.nom[0] ?? '').toUpperCase(),
      passagerCount: vol._count.passagers,
      nbPassagerMax: vol.ballon.nbPassagerMax,
      statut: vol.statut,
    }))

    return (
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <Link href={`/${locale}/vols/create`} className={cn(buttonVariants({ size: 'sm' }))}>
            {t('new')}
          </Link>
        </div>

        <WeekGrid weekStart={weekStartStr} vols={vols} locale={locale} />
      </main>
    )
  })
}
