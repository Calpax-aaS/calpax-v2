import { getTranslations } from 'next-intl/server'
import type { HourlyWeather, WeatherSummary, WindLevel } from '@/lib/weather/types'
import { classifyWind } from '@/lib/weather/classify'
import { cn } from '@/lib/utils'

type Props = {
  hours: HourlyWeather[]
  summary: WeatherSummary
  seuilVent: number
}

const LEVEL_BG: Record<WindLevel, string> = {
  OK: 'bg-green-100 text-green-800',
  WARNING: 'bg-amber-100 text-amber-800',
  DANGER: 'bg-red-100 text-red-800',
}

const WIND_CELL_BG: Record<WindLevel, string> = {
  OK: 'bg-green-50',
  WARNING: 'bg-amber-50',
  DANGER: 'bg-red-50',
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
    <td className={cn('px-2 py-1.5 text-center tabular-nums', WIND_CELL_BG[level])}>
      <div className="font-medium">{Math.round(speed)} kt</div>
      <div className="text-xs text-muted-foreground">{Math.round(direction)}&deg;</div>
    </td>
  )
}

export async function WeatherTable({ hours, summary, seuilVent }: Props) {
  const t = await getTranslations('meteo')

  return (
    <div className="space-y-3">
      {/* Summary banner */}
      <div
        className={cn(
          'rounded-md px-4 py-3 flex items-center justify-between',
          LEVEL_BG[summary.level],
        )}
      >
        <div>
          <span className="font-semibold">{t(`level.${summary.level}`)}</span>
          <span className="ml-3">
            {t('maxWind')}: {summary.maxWindKt} kt ({summary.maxWindAltitude})
          </span>
        </div>
        <div>
          {t('avgTemp')}: {summary.avgTemperature}&deg;C
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted text-left">
              <th className="px-2 py-2 border-b font-medium">{t('fields.heure')}</th>
              <th className="px-2 py-2 border-b font-medium text-center">{t('fields.vent10m')}</th>
              <th className="px-2 py-2 border-b font-medium text-center">{t('fields.vent80m')}</th>
              <th className="px-2 py-2 border-b font-medium text-center">{t('fields.vent120m')}</th>
              <th className="px-2 py-2 border-b font-medium text-center">{t('fields.vent180m')}</th>
              <th className="px-2 py-2 border-b font-medium text-center">
                {t('fields.temperature')}
              </th>
              <th className="px-2 py-2 border-b font-medium text-center">
                {t('fields.cloudCover')}
              </th>
              <th className="px-2 py-2 border-b font-medium text-center">
                {t('fields.precipitation')}
              </th>
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h.time} className="border-b last:border-b-0">
                <td className="px-2 py-1.5 font-medium">{h.time}</td>
                <WindCell
                  speed={h.wind10m.speed}
                  direction={h.wind10m.direction}
                  seuil={seuilVent}
                />
                <WindCell
                  speed={h.wind80m.speed}
                  direction={h.wind80m.direction}
                  seuil={seuilVent}
                />
                <WindCell
                  speed={h.wind120m.speed}
                  direction={h.wind120m.direction}
                  seuil={seuilVent}
                />
                <WindCell
                  speed={h.wind180m.speed}
                  direction={h.wind180m.direction}
                  seuil={seuilVent}
                />
                <td className="px-2 py-1.5 text-center tabular-nums">
                  {Math.round(h.temperature)}&deg;C
                </td>
                <td className="px-2 py-1.5 text-center tabular-nums">{h.cloudCover}%</td>
                <td className="px-2 py-1.5 text-center tabular-nums">{h.precipitationProb}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">{t('source')}</p>
    </div>
  )
}
