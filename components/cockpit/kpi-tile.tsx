import * as React from 'react'
import { cn } from '@/lib/utils'

type KpiTone = 'default' | 'dusk' | 'ok' | 'warn' | 'danger'

const VALUE_TONE: Record<KpiTone, string> = {
  default: 'text-sky-900',
  dusk: 'text-dusk-700',
  ok: 'text-[color:var(--success)]',
  warn: 'text-[color:var(--warning)]',
  danger: 'text-[color:var(--destructive)]',
}

type KpiTileProps = {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon?: React.ReactNode
  tone?: KpiTone
  className?: string
}

/**
 * Tuile cockpit — label en cap mono, valeur en Archivo mono large, sublabel.
 * Utilisée en rangée pour afficher les KPIs du dashboard jour J.
 */
export function KpiTile({ label, value, sub, icon, tone = 'default', className }: KpiTileProps) {
  return (
    <div className={cn('relative flex flex-col gap-1 px-4 py-3', className)}>
      <div className="mono cap flex items-center gap-1.5 text-[10px] text-sky-500">
        <span>{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span
          className={cn(
            'mono text-[24px] font-semibold leading-none tracking-tight',
            VALUE_TONE[tone],
          )}
        >
          {value}
        </span>
        {icon && <span className="mb-0.5 text-sky-500">{icon}</span>}
      </div>
      {sub && <div className="text-[11px] text-sky-500">{sub}</div>}
    </div>
  )
}

/**
 * Conteneur horizontal avec séparateurs pour une rangée de KpiTile.
 */
export function KpiRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 overflow-hidden rounded-lg border border-sky-100 bg-card shadow-[var(--sh-1)] lg:grid-cols-4',
        'divide-x divide-y divide-sky-100 lg:divide-y-0',
        className,
      )}
    >
      {children}
    </div>
  )
}
