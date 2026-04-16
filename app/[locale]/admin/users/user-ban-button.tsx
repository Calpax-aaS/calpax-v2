'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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

  function handleClick() {
    const next = !optimisticBanned
    if (next && !confirm(t('banConfirm'))) return

    startTransition(async () => {
      setOptimisticBanned(next)
      const result = await toggleUserBan({ userId, banned: next })
      if (result.error) {
        setOptimisticBanned(!next) // revert
        toast.error(result.error)
        return
      }
      toast.success(next ? t('banSuccess') : t('unbanSuccess'))
    })
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={optimisticBanned ? 'outline' : 'ghost'}
      disabled={pending}
      onClick={handleClick}
    >
      {optimisticBanned ? (
        <>
          <CircleCheck className="h-3.5 w-3.5 mr-1" />
          {t('unban')}
        </>
      ) : (
        <>
          <Ban className="h-3.5 w-3.5 mr-1" />
          {t('ban')}
        </>
      )}
    </Button>
  )
}
