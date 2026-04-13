import { getTranslations } from 'next-intl/server'
import type { HourlyWeather, WeatherSummary, WindLevel } from '@/lib/weather/types'
import { classifyWind } from '@/lib/weather/classify'
import { cn } from '@/lib/utils'

type Props = {
  hours: HourlyWeather[]
  summary: WeatherSummary
  seuilVent: number
}

const LEVEL_BANNER: Record<WindLevel, string> = {
  OK: 'bg-success/15 text-success',
  WARNING: 'bg-warning/15 text-warning',
  DANGER: 'bg-destructive/15 text-destructive',
}

const CELL_BG: Record<WindLevel, string> = {
  OK: 'bg-success/10',
  WARNING: 'bg-warning/10',
  DANGER: 'bg-destructive/10',
}

const ARROW_COLOR: Record<WindLevel, string> = {
  OK: '#334155',
  WARNING: '#92400e',
  DANGER: '#991b1b',
}

const ALTITUDES = ['180m', '120m', '80m', '10m'] as const
const ALTITUDE_KEYS = ['wind180m', 'wind120m', 'wind80m', 'wind10m'] as const

function WindArrow({ direction, color }: { direction: number; color: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      style={{ transform: `rotate(${direction}deg)` }}
    >
      <path
        d="M12 2 L12 20 M12 2 L7 8 M12 2 L17 8"
        stroke={color}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}

function WindCell({
  speed,
  direction,
  seuil,
}: {
  speed: number
  direction: number
  seuil: number
}) {
  const level = classifyWind(speed, seuil)
  return (
    <div
      className={cn(
        'rounded-md flex flex-col items-center justify-center py-1.5 min-h-[52px]',
        CELL_BG[level],
      )}
    >
      <span className="font-bold text-sm tabular-nums">{Math.round(speed)}</span>
      <WindArrow direction={direction} color={ARROW_COLOR[level]} />
    </div>
  )
}

export async function WeatherTable({ hours, summary, seuilVent }: Props) {
  const t = await getTranslations('meteo')

  if (hours.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('noData')}</p>
  }

  return (
    <div className="space-y-3">
      {/* Summary banner */}
      <div
        className={cn(
          'rounded-md px-4 py-3 flex items-center justify-between',
          LEVEL_BANNER[summary.level],
        )}
      >
        <div>
          <span className="font-semibold text-base">{t(`level.${summary.level}`)}</span>
          <span className="ml-3 text-sm">
            {t('maxWind')}: {summary.maxWindKt} km/h ({summary.maxWindAltitude})
          </span>
        </div>
        <div className="text-sm">
          {t('avgTemp')}: {summary.avgTemperature}&deg;C
        </div>
      </div>

      {/* Heatmap grid: altitude (rows) x hours (columns) */}
      <div className="overflow-x-auto">
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `56px repeat(${hours.length}, minmax(56px, 1fr))`,
          }}
        >
          {/* Header row — hours */}
          <div />
          {hours.map((h) => (
            <div key={h.time} className="text-center text-xs font-semibold py-1">
              {h.time}
            </div>
          ))}

          {/* Altitude rows — 180m (top) to 10m (bottom) */}
          {ALTITUDES.map((alt, altIdx) => (
            <>
              <div
                key={`label-${alt}`}
                className="flex items-center text-xs font-bold text-muted-foreground"
              >
                {alt}
              </div>
              {hours.map((h) => {
                const key = ALTITUDE_KEYS[altIdx]!
                const wind = h[key]
                return (
                  <WindCell
                    key={`${alt}-${h.time}`}
                    speed={wind.speed}
                    direction={wind.direction}
                    seuil={seuilVent}
                  />
                )
              })}
            </>
          ))}
        </div>

        {/* Info rows below the heatmap */}
        <div
          className="grid gap-1 mt-2 pt-2 border-t text-xs text-muted-foreground"
          style={{
            gridTemplateColumns: `56px repeat(${hours.length}, minmax(56px, 1fr))`,
          }}
        >
          <div className="font-semibold text-foreground">{t('fields.temperature')}</div>
          {hours.map((h) => (
            <div key={`oat-${h.time}`} className="text-center tabular-nums">
              {Math.round(h.temperature)}&deg;C
            </div>
          ))}

          <div className="font-semibold text-foreground">{t('fields.cloudCover')}</div>
          {hours.map((h) => (
            <div key={`cloud-${h.time}`} className="text-center tabular-nums">
              {h.cloudCover}%
            </div>
          ))}

          <div className="font-semibold text-foreground">{t('fields.precipitation')}</div>
          {hours.map((h) => (
            <div key={`precip-${h.time}`} className="text-center tabular-nums">
              {h.precipitationProb}%
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t('source')} — Seuil: {seuilVent} km/h
      </p>
    </div>
  )
}
