import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type EmptyStateProps = {
  message: string
  actionLabel?: string
  actionHref?: string
}

function BalloonSvg() {
  return (
    <svg
      width="80"
      height="96"
      viewBox="0 0 80 96"
      fill="none"
      className="text-muted-foreground/20"
    >
      <path
        d="M40 4 C28 4, 12 18, 12 38 C12 52, 20 62, 32 68 L34 70 L34 74 L46 74 L46 70 L48 68 C60 62, 68 52, 68 38 C68 18, 52 4, 40 4Z"
        fill="currentColor"
      />
      <line x1="34" y1="74" x2="36" y2="82" stroke="currentColor" strokeWidth="1.5" />
      <line x1="46" y1="74" x2="44" y2="82" stroke="currentColor" strokeWidth="1.5" />
      <rect x="34" y="82" width="12" height="8" rx="2" fill="currentColor" />
    </svg>
  )
}

export function EmptyState({ message, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <BalloonSvg />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'mt-4')}
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
