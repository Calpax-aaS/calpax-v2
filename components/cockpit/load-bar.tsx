import { cn } from '@/lib/utils'

type LoadBarTone = 'ink' | 'dusk' | 'ok' | 'warn' | 'danger'

const TONE_COLOR: Record<LoadBarTone, string> = {
  ink: 'var(--ink-500)',
  dusk: 'var(--dusk-500)',
  ok: 'var(--success)',
  warn: 'var(--warning)',
  danger: 'var(--destructive)',
}

/**
 * Jauge de remplissage horizontale — passagers, masse, carburant.
 * `showText` affiche `value/max` en mono à droite.
 */
export function LoadBar({
  value,
  max,
  tone = 'ink',
  height = 6,
  showText = false,
  label,
  className,
}: {
  value: number
  max: number
  tone?: LoadBarTone
  height?: number
  showText?: boolean
  label?: string
  className?: string
}) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && <span className="min-w-10 text-[11px] text-sky-500">{label}</span>}
      <div className="relative flex-1 overflow-hidden rounded-full bg-sky-100" style={{ height }}>
        <div
          className="h-full transition-[width] duration-300"
          style={{ width: `${pct * 100}%`, background: TONE_COLOR[tone] }}
        />
      </div>
      {showText && (
        <span className="mono text-[11px] text-sky-600">
          {value}/{max}
        </span>
      )}
    </div>
  )
}
