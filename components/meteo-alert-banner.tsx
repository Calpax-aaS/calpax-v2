'use client'

import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { cancelVol } from '@/lib/actions/vol'

type Props = {
  volId: string
  locale: string
}

export function MeteoAlertBanner({ volId, locale }: Props) {
  const t = useTranslations('dashboard')
  const [pending, startTransition] = useTransition()

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelVol(volId, locale, 'Météo')
      if (result?.error) {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        {t('meteoAlert')} — {t('meteoAlertAction')}
      </span>
      <ConfirmDialog
        title={t('cancelMeteoTitle')}
        description={t('cancelMeteoConfirm')}
        confirmLabel={t('cancelMeteo')}
        destructive
        onConfirm={handleCancel}
        trigger={
          <Button size="sm" variant="destructive" disabled={pending}>
            {t('cancelMeteo')}
          </Button>
        }
      />
    </div>
  )
}
