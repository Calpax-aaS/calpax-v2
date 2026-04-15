'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/empty-state'

export type VolSummary = {
  id: string
  date: string // YYYY-MM-DD
  creneau: 'MATIN' | 'SOIR'
  ballonNom: string
  piloteInitiales: string
  passagerCount: number
  nbPassagerMax: number
  statut: string
}

type WeekGridProps = {
  weekStart: string // YYYY-MM-DD (Monday)
  vols: VolSummary[]
  locale: string
  todayMonday: string // YYYY-MM-DD, computed server-side to avoid hydration mismatch
  emptyActionLabel?: string
  emptyActionHref?: string
}

const STATUT_BORDER: Record<string, string> = {
  PLANIFIE: 'border-l-4 border-l-primary',
  CONFIRME: 'border-l-4 border-l-success',
  EN_VOL: 'border-l-4 border-l-info',
  TERMINE: 'border-l-4 border-l-muted-foreground',
  ANNULE: 'border-l-4 border-l-destructive',
}

const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatShortDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  const parts = dateStr.split('-')
  const month = parts[1] ?? '01'
  const day = parts[2] ?? '01'
  return `${parseInt(day)}/${parseInt(month)}`
}

function getMondayOffset(current: string, delta: number): string {
  return addDays(current, delta * 7)
}

type VolCardProps = {
  vol: VolSummary
  locale: string
}

function VolCard({ vol, locale }: VolCardProps) {
  const borderClass = STATUT_BORDER[vol.statut] ?? 'border-l-4 border-l-border'
  return (
    <Link href={`/${locale}/vols/${vol.id}`} className="block">
      <div
        className={`bg-card rounded p-2 text-xs shadow-sm hover:shadow-md transition-shadow cursor-pointer ${borderClass}`}
      >
        <div className="font-semibold text-foreground truncate">{vol.ballonNom}</div>
        <div className="text-muted-foreground mt-0.5">{vol.piloteInitiales}</div>
        <div className="mt-1">
          <Badge variant="outline" className="text-xs px-1 py-0">
            {vol.passagerCount}/{vol.nbPassagerMax}
          </Badge>
        </div>
      </div>
    </Link>
  )
}

type CellProps = {
  date: string
  creneau: 'MATIN' | 'SOIR'
  vols: VolSummary[]
  locale: string
}

function Cell({ date, creneau, vols, locale }: CellProps) {
  const cellVols = vols.filter((v) => v.date === date && v.creneau === creneau)

  return (
    <div className="border border-border min-h-[80px] p-1 bg-muted/40 space-y-1">
      {cellVols.map((vol) => (
        <VolCard key={vol.id} vol={vol} locale={locale} />
      ))}
      <Link
        href={`/${locale}/vols/create?date=${date}&creneau=${creneau}`}
        className="flex items-center justify-center w-full h-6 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted rounded text-sm transition-colors"
        title="Nouveau vol"
      >
        +
      </Link>
    </div>
  )
}

export function WeekGrid({
  weekStart,
  vols,
  locale,
  todayMonday,
  emptyActionLabel,
  emptyActionHref,
}: WeekGridProps) {
  const t = useTranslations('vols')

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const prevWeek = getMondayOffset(weekStart, -1)
  const nextWeek = getMondayOffset(weekStart, 1)

  const navClass =
    'px-3 py-1.5 text-sm border border-border rounded hover:bg-muted transition-colors'

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <Link href={`/${locale}/vols?week=${prevWeek}`} className={navClass}>
          &larr;
        </Link>
        <Link href={`/${locale}/vols?week=${todayMonday}`} className={`${navClass} font-medium`}>
          {t('today')}
        </Link>
        <Link href={`/${locale}/vols?week=${nextWeek}`} className={navClass}>
          &rarr;
        </Link>
        <span className="text-sm text-muted-foreground ml-2">
          {t('week')} {formatShortDate(days[0] ?? weekStart)} &ndash;{' '}
          {formatShortDate(days[6] ?? weekStart)}
        </span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-[80px_repeat(7,1fr)] min-w-[640px]">
          {/* Header row */}
          <div className="border border-border bg-card p-2" />
          {days.map((day, i) => (
            <div key={day} className="border border-border bg-card p-2 text-center">
              <div className="text-xs font-semibold text-foreground">{DAY_SHORT[i]}</div>
              <div className="text-xs text-muted-foreground">{formatShortDate(day)}</div>
            </div>
          ))}

          {/* MATIN row */}
          <div className="border border-border bg-card p-2 flex items-center justify-center">
            <span className="text-xs font-medium text-muted-foreground writing-mode-vertical rotate-0">
              {t('creneau.MATIN')}
            </span>
          </div>
          {days.map((day) => (
            <Cell key={`matin-${day}`} date={day} creneau="MATIN" vols={vols} locale={locale} />
          ))}

          {/* SOIR row */}
          <div className="border border-border bg-card p-2 flex items-center justify-center">
            <span className="text-xs font-medium text-muted-foreground">{t('creneau.SOIR')}</span>
          </div>
          {days.map((day) => (
            <Cell key={`soir-${day}`} date={day} creneau="SOIR" vols={vols} locale={locale} />
          ))}
        </div>
      </div>

      {vols.length === 0 && (
        <EmptyState
          message={t('noVols')}
          actionLabel={emptyActionLabel}
          actionHref={emptyActionHref}
        />
      )}
    </div>
  )
}
