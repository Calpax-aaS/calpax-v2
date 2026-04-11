'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

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
}

const STATUT_BORDER: Record<string, string> = {
  PLANIFIE: 'border-l-4 border-blue-500',
  CONFIRME: 'border-l-4 border-green-500',
  TERMINE: 'border-l-4 border-amber-500',
  ANNULE: 'border-l-4 border-gray-400',
}

const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
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

function getTodayMonday(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(today)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

type VolCardProps = {
  vol: VolSummary
  locale: string
}

function VolCard({ vol, locale }: VolCardProps) {
  const borderClass = STATUT_BORDER[vol.statut] ?? 'border-l-4 border-gray-300'
  return (
    <Link href={`/${locale}/vols/${vol.id}`} className="block">
      <div
        className={`bg-white rounded p-2 text-xs shadow-sm hover:shadow-md transition-shadow cursor-pointer ${borderClass}`}
      >
        <div className="font-semibold text-gray-900 truncate">{vol.ballonNom}</div>
        <div className="text-gray-500 mt-0.5">{vol.piloteInitiales}</div>
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
    <div className="border border-gray-100 min-h-[80px] p-1 bg-gray-50 space-y-1">
      {cellVols.map((vol) => (
        <VolCard key={vol.id} vol={vol} locale={locale} />
      ))}
      <Link
        href={`/${locale}/vols/create?date=${date}&creneau=${creneau}`}
        className="flex items-center justify-center w-full h-6 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded text-sm transition-colors"
        title="Nouveau vol"
      >
        +
      </Link>
    </div>
  )
}

export function WeekGrid({ weekStart, vols, locale }: WeekGridProps) {
  const t = useTranslations('vols')
  const router = useRouter()
  const searchParams = useSearchParams()

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const todayMonday = getTodayMonday()

  function navigate(delta: number) {
    const newWeek = getMondayOffset(weekStart, delta)
    const params = new URLSearchParams(searchParams.toString())
    params.set('week', newWeek)
    router.push(`?${params.toString()}`)
  }

  function navigateToday() {
    const params = new URLSearchParams(searchParams.toString())
    params.set('week', todayMonday)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 transition-colors"
        >
          &larr;
        </button>
        <button
          onClick={navigateToday}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 transition-colors font-medium"
        >
          {t('today')}
        </button>
        <button
          onClick={() => navigate(1)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 transition-colors"
        >
          &rarr;
        </button>
        <span className="text-sm text-gray-500 ml-2">
          {t('week')} {formatShortDate(days[0] ?? weekStart)} &ndash;{' '}
          {formatShortDate(days[6] ?? weekStart)}
        </span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-[80px_repeat(7,1fr)] min-w-[640px]">
          {/* Header row */}
          <div className="border border-gray-200 bg-white p-2" />
          {days.map((day, i) => (
            <div key={day} className="border border-gray-200 bg-white p-2 text-center">
              <div className="text-xs font-semibold text-gray-700">{DAY_SHORT[i]}</div>
              <div className="text-xs text-gray-400">{formatShortDate(day)}</div>
            </div>
          ))}

          {/* MATIN row */}
          <div className="border border-gray-200 bg-white p-2 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-600 writing-mode-vertical rotate-0">
              {t('creneau.MATIN')}
            </span>
          </div>
          {days.map((day) => (
            <Cell key={`matin-${day}`} date={day} creneau="MATIN" vols={vols} locale={locale} />
          ))}

          {/* SOIR row */}
          <div className="border border-gray-200 bg-white p-2 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-600">{t('creneau.SOIR')}</span>
          </div>
          {days.map((day) => (
            <Cell key={`soir-${day}`} date={day} creneau="SOIR" vols={vols} locale={locale} />
          ))}
        </div>
      </div>

      {vols.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">{t('noVols')}</p>
      )}
    </div>
  )
}
