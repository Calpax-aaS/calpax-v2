import * as React from 'react'
import { cn } from '@/lib/utils'

type MonoLabelProps = {
  as?: 'span' | 'div'
  children: React.ReactNode
  className?: string
}

/**
 * Micro-label cockpit — font-mono + uppercase + letter-spacing + 10px sky-500.
 * Used for every "meta" label above a value (field labels, section kickers,
 * table headers) to keep typography consistent.
 */
export function MonoLabel({ as: Tag = 'span', children, className }: MonoLabelProps) {
  return <Tag className={cn('mono cap text-[10px] text-sky-500', className)}>{children}</Tag>
}
