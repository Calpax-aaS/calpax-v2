'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Chip } from '@/components/cockpit/chip'
import { MonoValue } from '@/components/cockpit/mono-value'

export type UpcomingFlight = {
  id: string
  date: string // YYYY-MM-DD
  creneau: 'MATIN' | 'SOIR'
  statut: string
  ballonImmat: string
  ballonNom: string
  piloteNom: string
  passagerCount: number
  passagerMax: number
}

const STATUT_TONE: Record<string, Parameters<typeof Chip>[0]['tone']> = {
  PLANIFIE: 'neutral',
  CONFIRME: 'info',
  TERMINE: 'ok',
  ARCHIVE: 'neutral',
  ANNULE: 'danger',
}

function formatDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  return d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

type Props = {
  flights: UpcomingFlight[]
  locale: string
}

/**
 * Mini-table des 7 prochains vols planifiés — densité cockpit, clic row → détail.
 */
export function UpcomingFlightsTable({ flights, locale }: Props) {
  const t = useTranslations('dashboard')
  const tv = useTranslations('vols')
  if (flights.length === 0) return null
  return (
    <section className="space-y-2">
      <h2 className="font-display text-sm font-semibold text-sky-900">
        {t('upcoming.title', { count: flights.length })}
      </h2>
      <div className="overflow-hidden rounded-lg border border-sky-100 bg-card shadow-[var(--sh-1)]">
        <table className="w-full text-left text-[12px]">
          <thead className="bg-sky-50">
            <tr className="mono cap text-[10px] text-sky-500">
              <th className="px-3 py-2 font-medium">{t('upcoming.col.date')}</th>
              <th className="px-3 py-2 font-medium">{t('upcoming.col.creneau')}</th>
              <th className="px-3 py-2 font-medium">{t('upcoming.col.ballon')}</th>
              <th className="px-3 py-2 font-medium">{t('upcoming.col.pilote')}</th>
              <th className="px-3 py-2 font-medium">{t('upcoming.col.pax')}</th>
              <th className="px-3 py-2 font-medium">{t('upcoming.col.statut')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100">
            {flights.map((f) => (
              <tr key={f.id} className="transition-colors hover:bg-sky-50">
                <td className="px-3 py-2">
                  <Link href={`/${locale}/vols/${f.id}`} className="block text-sky-900">
                    {formatDate(f.date, locale)}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Chip tone="dusk" size="sm">
                    {tv(`creneau.${f.creneau}`)}
                  </Chip>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <MonoValue value={f.ballonImmat} size={11} tone="muted" />
                    <span className="truncate text-sky-900">{f.ballonNom}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-sky-700">{f.piloteNom}</td>
                <td className="px-3 py-2">
                  <MonoValue value={`${f.passagerCount}/${f.passagerMax}`} size={11} />
                </td>
                <td className="px-3 py-2">
                  <Chip tone={STATUT_TONE[f.statut] ?? 'neutral'} size="sm">
                    {tv(`statut.${f.statut}`)}
                  </Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
