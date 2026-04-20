import { CalpaxLogo } from './calpax-logo'
import { cn } from '@/lib/utils'

type CalpaxWordmarkProps = {
  size?: number
  subtitle?: string | null
  className?: string
  wordmarkClassName?: string
  subtitleClassName?: string
  priority?: boolean
}

/**
 * Logo + wordmark "Calpax" en Archivo 600. Utilisé dans la sidebar,
 * le login et les entêtes de pages de marque.
 *
 * Le prop `subtitle` est optionnel (ex: nom de l'exploitant + pill "en vol").
 */
export function CalpaxWordmark({
  size = 22,
  subtitle,
  className,
  wordmarkClassName,
  subtitleClassName,
  priority = false,
}: CalpaxWordmarkProps) {
  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <CalpaxLogo size={size + 6} priority={priority} />
      <div className="flex flex-col leading-none">
        <span
          className={cn('font-display font-semibold tracking-tight', wordmarkClassName)}
          style={{ fontSize: size + 2, letterSpacing: '-0.01em' }}
        >
          Calpax
        </span>
        {subtitle && (
          <span
            className={cn(
              'mono cap mt-1.5 text-[10px] leading-none text-sky-400',
              subtitleClassName,
            )}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  )
}
