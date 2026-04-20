'use client'

import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'

type Props = {
  message: string
  onDismiss: () => void
}

export function DismissibleError({ message, onDismiss }: Props) {
  const t = useTranslations('common')
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mb-4 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive flex items-start justify-between gap-2"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('dismiss')}
        className="min-h-[44px] min-w-[44px] -my-2 -mr-2 flex items-center justify-center text-destructive/70 hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
