import * as React from 'react'
import { cn } from '@/lib/utils'

type ChipTone = 'neutral' | 'ok' | 'warn' | 'danger' | 'info' | 'dusk' | 'ink'
type ChipSize = 'sm' | 'md'

const TONE_STYLES: Record<ChipTone, { bg: string; fg: string; bd: string }> = {
  neutral: { bg: 'var(--sky-100)', fg: 'var(--sky-600)', bd: 'var(--sky-200)' },
  ok: { bg: '#e6f4ec', fg: '#1e6b44', bd: '#c9e6d5' },
  warn: { bg: '#fdf1d8', fg: '#8a5300', bd: '#f3dcaf' },
  danger: { bg: '#fbe6e6', fg: '#8a1c1c', bd: '#f3c7c7' },
  info: { bg: '#e4eef8', fg: '#1a4a7e', bd: '#c8d9ea' },
  dusk: { bg: 'var(--dusk-100)', fg: 'var(--dusk-700)', bd: 'var(--dusk-200)' },
  ink: { bg: 'var(--ink-600)', fg: 'var(--sky-100)', bd: 'var(--ink-600)' },
}

type ChipProps = {
  tone?: ChipTone
  size?: ChipSize
  icon?: React.ReactNode
  className?: string
  children: React.ReactNode
}

/**
 * Chip cockpit — rectangulaire (radius 4px), palette dédiée par tone.
 * Distinct du Badge shadcn (pill rond) : utilisé pour statuts de vol,
 * alertes réglementaires, étiquettes météo.
 */
export function Chip({ tone = 'neutral', size = 'sm', icon, className, children }: ChipProps) {
  const palette = TONE_STYLES[tone]
  const isSm = size === 'sm'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap font-medium',
        isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        className,
      )}
      style={{
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.bd}`,
        borderRadius: 4,
        lineHeight: 1.4,
      }}
    >
      {icon}
      {children}
    </span>
  )
}
