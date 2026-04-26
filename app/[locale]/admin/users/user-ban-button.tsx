'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { toggleUserBan } from '@/lib/actions/admin'
import { Ban, CircleCheck } from 'lucide-react'

type Props = {
  userId: string
  banned: boolean
}

export function UserBanButton({ userId, banned }: Props) {
  const t = useTranslations('admin.users')
  const [pending, startTransition] = useTransition()
  const [optimisticBanned, setOptimisticBanned] = useState(banned)

  function applyToggle(next: boolean) {
    startTransition(async () => {
      setOptimisticBanned(next)
      const result = await toggleUserBan({ userId, banned: next })
      if (result.error) {
        setOptimisticBanned(!next)
        toast.error(result.error)
        return
      }
      toast.success(next ? t('banSuccess') : t('unbanSuccess'))
    })
  }

  if (optimisticBanned) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => applyToggle(false)}
      >
        <CircleCheck className="h-3.5 w-3.5 mr-1" />
        {t('unban')}
      </Button>
    )
  }

  return (
    <ConfirmDialog
      title={t('banConfirmTitle')}
      description={t('banConfirm')}
      confirmLabel={t('ban')}
      destructive
      onConfirm={() => applyToggle(true)}
      trigger={
        <Button type="button" size="sm" variant="ghost" disabled={pending}>
          <Ban className="h-3.5 w-3.5 mr-1" />
          {t('ban')}
        </Button>
      }
    />
  )
}
