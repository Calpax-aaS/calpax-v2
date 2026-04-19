'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Eye } from 'lucide-react'

type Props = {
  exploitantName: string
}

export function ImpersonationBanner({ exploitantName }: Props) {
  const locale = useLocale()
  const t = useTranslations('impersonation')

  return (
    <div
      role="alert"
      className="sticky top-0 z-40 bg-amber-500 text-amber-950 px-4 py-2 text-sm font-medium flex items-center justify-between gap-3 shadow-md"
    >
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 shrink-0" />
        <span>
          {t('connectedAs')} <strong>{exploitantName}</strong>
        </span>
      </div>
      <Link
        href={`/${locale}/admin`}
        className="rounded-md bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-700 transition-colors whitespace-nowrap"
      >
        {t('exit')}
      </Link>
    </div>
  )
}
