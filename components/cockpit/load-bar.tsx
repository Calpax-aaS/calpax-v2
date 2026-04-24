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
 *
 * Le rail interne expose le rôle ARIA `progressbar` avec `aria-valuemin/max/now`
 * pour que les lecteurs d'écran annoncent la jauge sans dépendre du texte adjacent.
 * `aria-label` (FR par défaut) est surchargeable via `ariaLabel`.
 */
export function LoadBar({
  value,
  max,
  tone = 'ink',
  height = 6,
  showText = false,
  label,
  ariaLabel,
  className,
}: {
  value: number
  max: number
  tone?: LoadBarTone
  height?: number
  showText?: boolean
  label?: string
  /** Override du aria-label du rail. Défaut : label visible ou "jauge". */
  ariaLabel?: string
  className?: string
}) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const railLabel = ariaLabel ?? label ?? 'jauge'
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && <span className="min-w-10 text-[11px] text-sky-500">{label}</span>}
      <div
        className="relative flex-1 overflow-hidden rounded-full bg-sky-100"
        style={{ height }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={`${railLabel} : ${value} sur ${max}`}
      >
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
