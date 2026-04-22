'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Eye } from 'lucide-react'

type Props = {
  /**
   * Name displayed after "Connecté en tant que" — typically the impersonated
   * user's name when Better Auth's admin plugin is active, or an exploitant
   * name for tenant-level impersonation.
   */
  targetName: string
}

/**
 * Visible warning that the current request is running under an admin
 * impersonation. Rendered at layout level when the session carries an
 * `impersonatedBy` marker so it shows on every page.
 *
 * Contrast: amber-500 background (#f59e0b) with amber-950 text (#451a03)
 * ~ 7.5:1 luminance ratio — WCAG AAA. Sticky top-0 z-40 so it stays
 * visible above the mobile header and content scroll.
 */
export function ImpersonationBanner({ targetName }: Props) {
  const locale = useLocale()
  const t = useTranslations('impersonation')

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950 shadow-md"
    >
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {t('connectedAs')} <strong>{targetName}</strong>
        </span>
      </div>
      <Link
        href={`/${locale}/admin`}
        className="whitespace-nowrap rounded-md bg-amber-600 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {t('exit')}
      </Link>
    </div>
  )
}
