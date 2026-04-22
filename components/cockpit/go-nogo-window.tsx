'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { HourlyWeather } from '@/lib/weather/types'

type WindowLevel = 'GO' | 'HOLD' | 'NOGO'

const LEVEL_STYLES: Record<WindowLevel, string> = {
  GO: 'bg-emerald-50 text-[color:var(--success)]',
  HOLD: 'bg-dusk-50 text-dusk-700',
  NOGO: 'bg-red-50 text-[color:var(--destructive)]',
}

function hourLevel(windKmh: number, seuilVent: number): WindowLevel {
  if (windKmh >= seuilVent) return 'NOGO'
  if (windKmh >= seuilVent * 0.75) return 'HOLD'
  return 'GO'
}

function maxWindOfHour(h: HourlyWeather): number {
  return Math.max(h.wind10m.speed, h.wind80m.speed, h.wind120m.speed, h.wind180m.speed)
}

type CreneauTimelineProps = {
  label: string
  hours: HourlyWeather[]
  seuilVent: number
}

function CreneauTimeline({ label, hours, seuilVent }: CreneauTimelineProps) {
  const t = useTranslations('dashboard')
  if (hours.length === 0) {
    return (
      <div className="flex items-center gap-3 py-1.5 text-[11px]">
        <span className="mono cap w-14 shrink-0 text-sky-500">{label}</span>
        <span className="italic text-sky-400">{t('window.noData')}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3">
      <span className="mono cap w-14 shrink-0 text-sky-500">{label}</span>
      <div className="flex flex-1 gap-0.5">
        {hours.map((h) => {
          const wind = Math.round(maxWindOfHour(h))
          const level = hourLevel(wind, seuilVent)
          return (
            <div
              key={h.time}
              title={`${h.time} · ${wind}kt · ${t(`window.level.${level}`)}`}
              className={cn(
                'flex flex-1 flex-col items-center justify-center rounded px-1 py-1.5',
                LEVEL_STYLES[level],
              )}
            >
              <span className="mono text-[10px] font-semibold leading-tight">
                {h.time.slice(0, 2)}h
              </span>
              <span className="mono text-[10px] leading-tight opacity-80">{wind}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type GoNogoWindowProps = {
  matinHours: HourlyWeather[]
  soirHours: HourlyWeather[]
  seuilVent: number
}

/**
 * Fenêtre GO/HOLD/NO-GO — 2 timelines horaires (matin + soir) avec chaque
 * case colorée selon la vitesse du vent par rapport au seuil exploitant.
 * GO      si vent < 75% seuil
 * HOLD    si 75% seuil ≤ vent < seuil
 * NO-GO   si vent ≥ seuil
 */
export function GoNogoWindow({ matinHours, soirHours, seuilVent }: GoNogoWindowProps) {
  const t = useTranslations('dashboard')
  return (
    <section className="space-y-3 rounded-lg border border-sky-100 bg-card p-4 shadow-[var(--sh-1)]">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-sky-900">{t('window.title')}</h2>
        <div className="mono flex items-center gap-3 text-[10px] text-sky-500">
          <Legend color="bg-emerald-50" label={t('window.level.GO')} />
          <Legend color="bg-dusk-50" label={t('window.level.HOLD')} />
          <Legend color="bg-red-50" label={t('window.level.NOGO')} />
          <span className="cap opacity-70">{t('window.threshold', { value: seuilVent })}</span>
        </div>
      </div>
      <div className="space-y-2">
        <CreneauTimeline label={t('window.matin')} hours={matinHours} seuilVent={seuilVent} />
        <CreneauTimeline label={t('window.soir')} hours={soirHours} seuilVent={seuilVent} />
      </div>
    </section>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-sm border border-sky-200', color)} aria-hidden />
      <span>{label}</span>
    </span>
  )
}
