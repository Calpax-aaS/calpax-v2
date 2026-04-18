'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('common')

  useEffect(() => {
    console.error(error)
  }, [error])

  const isForbidden = error.message === 'Forbidden' || error.digest?.includes('403')

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <ShieldAlert className="h-12 w-12 text-muted-foreground/40" />
      <h2 className="text-xl font-semibold">{isForbidden ? t('forbidden') : t('error')}</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        {isForbidden ? t('forbiddenMessage') : t('errorMessage')}
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>
          {t('retry')}
        </Button>
        <Button asChild>
          <Link href="/">{t('backHome')}</Link>
        </Button>
      </div>
    </div>
  )
}
