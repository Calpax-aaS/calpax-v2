import { Fragment, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type TopBarProps = {
  title: ReactNode
  subtitle?: ReactNode
  /** Fil d'ariane — affiché en petit au-dessus du titre */
  crumbs?: ReactNode[]
  /** Slot droit: boutons d'action, toggles, chips meteo... */
  right?: ReactNode
  className?: string
}

/**
 * Topbar cockpit — à utiliser comme premier enfant d'une page du groupe `(app)`.
 * Ne fait aucune hypothèse sur le layout : densité dense (min-height 58px),
 * fond blanc sur border bas sky-100.
 */
export function TopBar({ title, subtitle, crumbs = [], right, className }: TopBarProps) {
  return (
    <div
      className={cn(
        'flex min-h-14 items-center gap-4 border-b border-sky-100 bg-card px-4 py-3 md:px-6',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {crumbs.length > 0 && (
          <div className="mb-0.5 flex items-center gap-1.5 text-[11px] text-sky-500">
            {crumbs.map((crumb, i) => (
              <Fragment key={i}>
                <span>{crumb}</span>
                {i < crumbs.length - 1 && <span className="opacity-50">/</span>}
              </Fragment>
            ))}
          </div>
        )}
        <div className="font-display text-lg font-medium leading-tight tracking-tight text-sky-900">
          {title}
        </div>
        {subtitle && <div className="mt-0.5 text-xs text-sky-500">{subtitle}</div>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  )
}
