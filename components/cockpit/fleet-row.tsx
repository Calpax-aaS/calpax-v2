'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Chip } from '@/components/cockpit/chip'
import { MonoValue } from '@/components/cockpit/mono-value'
import { formatDateDayMonth, parseDateOnly } from '@/lib/format'

export type FleetBallon = {
  id: string
  nom: string
  immat: string
  actif: boolean
  camoStatus: 'OK' | 'SOON' | 'EXPIRED' | 'UNKNOWN'
  nextFlight: { date: string; creneau: 'MATIN' | 'SOIR' } | null
}

type Props = {
  ballons: FleetBallon[]
  locale: string
}

const CAMO_TONE: Record<FleetBallon['camoStatus'], Parameters<typeof Chip>[0]['tone']> = {
  OK: 'ok',
  SOON: 'warn',
  EXPIRED: 'danger',
  UNKNOWN: 'neutral',
}

/**
 * Flotte — ligne de cartes compactes: immat mono + nom ballon + statut CAMO
 * + prochain vol (date · créneau). Clic → détail ballon.
 */
export function FleetRow({ ballons, locale }: Props) {
  const t = useTranslations('dashboard')
  if (ballons.length === 0) return null
  return (
    <section className="space-y-2">
      <h2 className="font-display text-sm font-semibold text-sky-900">{t('fleet.title')}</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ballons.map((b) => (
          <Link
            key={b.id}
            href={`/${locale}/ballons/${b.id}`}
            className="flex items-center gap-3 rounded-lg border border-sky-100 bg-card p-3 shadow-[var(--sh-1)] transition-shadow hover:shadow-[var(--sh-2)]"
          >
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 min-w-0">
                <MonoValue value={b.immat} size={12} />
                <span className="truncate text-[13px] font-medium text-sky-900">{b.nom}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-sky-500">
                <Chip tone={CAMO_TONE[b.camoStatus]} size="sm">
                  {t(`fleet.camo.${b.camoStatus}`)}
                </Chip>
                {b.nextFlight ? (
                  <span className="mono">
                    {formatDateDayMonth(parseDateOnly(b.nextFlight.date), locale)} ·{' '}
                    {t(`fleet.creneau.${b.nextFlight.creneau}`)}
                  </span>
                ) : (
                  <span className="italic text-sky-400">{t('fleet.noNextFlight')}</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
