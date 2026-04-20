import { cn } from '@/lib/utils'

type MonoTone = 'default' | 'muted' | 'ok' | 'warn' | 'danger' | 'dusk' | 'inverted'

const TONE_CLASS: Record<MonoTone, string> = {
  default: 'text-sky-900',
  muted: 'text-sky-500',
  ok: 'text-[color:var(--success)]',
  warn: 'text-[color:var(--warning)]',
  danger: 'text-[color:var(--destructive)]',
  dusk: 'text-dusk-700',
  inverted: 'text-dusk-200',
}

export function MonoValue({
  value,
  unit,
  tone = 'default',
  size = 13,
  className,
}: {
  value: React.ReactNode
  unit?: string
  tone?: MonoTone
  size?: number
  className?: string
}) {
  return (
    <span
      className={cn('mono', TONE_CLASS[tone], className)}
      style={{ fontSize: size, lineHeight: 1.2 }}
    >
      {value}
      {unit && <span className="ml-0.5 opacity-60">{unit}</span>}
    </span>
  )
}
