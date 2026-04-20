import { cn } from '@/lib/utils'

type StatusTone = 'ok' | 'warn' | 'danger' | 'idle' | 'info' | 'dusk'

const TONE_COLOR: Record<StatusTone, string> = {
  ok: 'var(--success)',
  warn: 'var(--warning)',
  danger: 'var(--destructive)',
  info: 'var(--info)',
  idle: 'var(--sky-300)',
  dusk: 'var(--dusk-500)',
}

export function StatusDot({
  tone = 'ok',
  pulse = false,
  size = 8,
  className,
}: {
  tone?: StatusTone
  pulse?: boolean
  size?: number
  className?: string
}) {
  const color = TONE_COLOR[tone]
  return (
    <span
      className={cn('relative inline-block shrink-0', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="absolute inset-0 rounded-full" style={{ background: color }} />
      {pulse && (
        <span
          className="absolute rounded-full"
          style={{
            inset: -Math.max(2, Math.floor(size / 2.5)),
            background: color,
            animation: 'cpx-pulse 1.8s ease-out infinite',
          }}
        />
      )}
    </span>
  )
}
