'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Chip } from '@/components/cockpit/chip'
import { MonoValue } from '@/components/cockpit/mono-value'
import { EmptyState } from '@/components/empty-state'
import { cn } from '@/lib/utils'

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

// Colored left border on vol cards, by lifecycle status
const STATUT_BAR: Record<string, string> = {
  PLANIFIE: 'border-l-sky-400',
  CONFIRME: 'border-l-[color:var(--success)]',
  EN_VOL: 'border-l-[color:var(--info)]',
  TERMINE: 'border-l-sky-300',
  ARCHIVE: 'border-l-sky-300',
  ANNULE: 'border-l-[color:var(--destructive)]',
}

const DAY_SHORT_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const DAY_SHORT_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatShortDate(dateStr: string): string {
  const parts = dateStr.split('-')
  const month = parts[1] ?? '01'
  const day = parts[2] ?? '01'
  return `${parseInt(day)}/${parseInt(month)}`
}

function getMondayOffset(current: string, delta: number): string {
  return addDays(current, delta * 7)
}

function capacityTone(count: number, max: number): Parameters<typeof Chip>[0]['tone'] {
  if (max === 0) return 'neutral'
  if (count > max) return 'danger'
  if (count / max >= 0.8) return 'warn'
  if (count / max >= 0.5) return 'info'
  return 'neutral'
}

function VolCard({ vol, locale }: { vol: VolSummary; locale: string }) {
  const barClass = STATUT_BAR[vol.statut] ?? 'border-l-sky-200'
  return (
    <Link
      href={`/${locale}/vols/${vol.id}`}
      className={cn(
        'block rounded border border-sky-100 border-l-[3px] bg-card px-2 py-1.5 text-[11px] shadow-[var(--sh-1)] transition-shadow hover:shadow-[var(--sh-2)]',
        barClass,
      )}
    >
      <div className="truncate font-medium leading-tight text-sky-900">{vol.ballonNom}</div>
      <div className="mono flex items-center justify-between text-[10px] text-sky-500">
        <span>{vol.piloteInitiales}</span>
        <Chip tone={capacityTone(vol.passagerCount, vol.nbPassagerMax)} size="sm">
          <MonoValue value={`${vol.passagerCount}/${vol.nbPassagerMax}`} size={10} />
        </Chip>
      </div>
    </Link>
  )
}

function Cell({
  date,
  creneau,
  vols,
  locale,
}: {
  date: string
  creneau: 'MATIN' | 'SOIR'
  vols: VolSummary[]
  locale: string
}) {
  const cellVols = vols.filter((v) => v.date === date && v.creneau === creneau)
  return (
    <div className="flex min-h-[72px] flex-col gap-1 border-b border-r border-sky-100 bg-sky-0/60 p-1.5">
      {cellVols.map((vol) => (
        <VolCard key={vol.id} vol={vol} locale={locale} />
      ))}
      <Link
        href={`/${locale}/vols/create?date=${date}&creneau=${creneau}`}
        className="flex h-6 w-full items-center justify-center rounded text-sky-300 transition-colors hover:bg-sky-100 hover:text-sky-500"
        aria-label="Nouveau vol"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
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
  const DAY_SHORT = locale === 'fr' ? DAY_SHORT_FR : DAY_SHORT_EN

  const navClass =
    'mono cap inline-flex items-center rounded-md border border-sky-200 bg-card px-3 py-1.5 text-[11px] text-sky-700 transition-colors hover:border-dusk-300 hover:text-dusk-700'

  return (
    <div className="space-y-3">
      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <Link
          href={`/${locale}/vols?week=${prevWeek}`}
          className={navClass}
          aria-label="Previous week"
        >
          &larr;
        </Link>
        <Link href={`/${locale}/vols?week=${todayMonday}`} className={cn(navClass, 'font-medium')}>
          {t('today')}
        </Link>
        <Link href={`/${locale}/vols?week=${nextWeek}`} className={navClass} aria-label="Next week">
          &rarr;
        </Link>
        <span className="mono ml-2 text-[11px] text-sky-500">
          {t('week')} {formatShortDate(days[0] ?? weekStart)} &ndash;{' '}
          {formatShortDate(days[6] ?? weekStart)}
        </span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-lg border border-sky-100 bg-card shadow-[var(--sh-1)]">
        <div className="grid min-w-[640px] grid-cols-[64px_repeat(7,1fr)]">
          {/* Header row */}
          <div className="border-b border-r border-sky-100 bg-sky-50" />
          {days.map((day, i) => (
            <div
              key={day}
              className="flex flex-col items-center gap-0.5 border-b border-r border-sky-100 bg-sky-50 px-2 py-2 last:border-r-0"
            >
              <div className="mono cap text-[10px] text-sky-500">{DAY_SHORT[i]}</div>
              <div className="mono text-[12px] font-medium text-sky-900">
                {formatShortDate(day)}
              </div>
            </div>
          ))}

          {/* MATIN row */}
          <div className="flex items-center justify-center border-b border-r border-sky-100 bg-sky-50 px-2 py-3">
            <span className="mono cap text-[10px] text-sky-700">{t('creneau.MATIN')}</span>
          </div>
          {days.map((day) => (
            <Cell key={`matin-${day}`} date={day} creneau="MATIN" vols={vols} locale={locale} />
          ))}

          {/* SOIR row */}
          <div className="flex items-center justify-center border-r border-sky-100 bg-sky-50 px-2 py-3">
            <span className="mono cap text-[10px] text-sky-700">{t('creneau.SOIR')}</span>
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
