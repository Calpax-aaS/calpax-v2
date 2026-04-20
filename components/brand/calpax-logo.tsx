import Image from 'next/image'
import { cn } from '@/lib/utils'

type CalpaxLogoProps = {
  size?: number
  className?: string
  priority?: boolean
}

/**
 * Brand mark Calpax — écusson hand-drawn + 2 ballons en réserve.
 * Rendered via next/image pour bénéficier de la mise en cache et des dimensions imposées.
 * Aspect ratio du SVG source: 575x540 ≈ 1.065.
 */
export function CalpaxLogo({ size = 32, className, priority = false }: CalpaxLogoProps) {
  const height = Math.round(size * (540 / 575))
  return (
    <Image
      src="/logo.svg"
      alt=""
      width={size}
      height={height}
      priority={priority}
      className={cn('block shrink-0', className)}
    />
  )
}
