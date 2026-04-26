'use client'

import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'

type Props = {
  actif: boolean
  onToggle?: (actif: boolean) => Promise<{ error?: string }>
  // Legacy props (used by equipiers, vehicules, sites pages)
  id?: string
  locale?: string
  action?: (id: string, locale: string) => Promise<{ error?: string }>
}

export function ToggleActifButton({ actif, onToggle, id, locale, action }: Props) {
  const t = useTranslations('common')
  const [pending, startTransition] = useTransition()

  function applyToggle() {
    const next = !actif
    startTransition(async () => {
      let result: { error?: string }
      if (onToggle) {
        result = await onToggle(next)
      } else if (action && id && locale) {
        result = await action(id, locale)
      } else {
        return
      }
      if (result.error) {
        toast.error(result.error)
      }
    })
  }

  const next = !actif
  const title = next ? t('activateConfirmTitle') : t('deactivateConfirmTitle')
  const description = next ? t('activateConfirm') : t('deactivateConfirm')

  return (
    <ConfirmDialog
      title={title}
      description={description}
      confirmLabel={next ? t('activate') : t('deactivate')}
      destructive={!next}
      onConfirm={applyToggle}
      trigger={
        <Button variant={actif ? 'outline' : 'default'} size="sm" disabled={pending}>
          {actif ? t('deactivate') : t('activate')}
        </Button>
      }
    />
  )
}
