'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'

type Props = {
  exploitantName: string
}

export function ImpersonationBanner({ exploitantName }: Props) {
  const locale = useLocale()

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 text-sm font-medium flex items-center justify-between">
      <span>
        Vous etes connecte en tant que <strong>{exploitantName}</strong>
      </span>
      <Link
        href={`/${locale}/admin`}
        className="rounded-md bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-700 transition-colors"
      >
        Revenir
      </Link>
    </div>
  )
}
