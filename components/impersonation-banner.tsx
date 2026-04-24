'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Eye } from 'lucide-react'
import { stopImpersonation } from '@/lib/admin/impersonation-actions'

type Props = {
  /**
   * Name displayed after "Connecté en tant que" — typically the impersonated
   * user's name when Better Auth's admin plugin is active, or an exploitant
   * name for tenant-level impersonation (#59).
   */
  targetName: string
  /**
   * Distinguishes user-level impersonation (Better Auth admin plugin) from
   * exploitant-level impersonation (#59 cookie). Drives whether "Revenir"
   * runs the cookie-clearing server action or just links back to /admin.
   */
  kind: 'user' | 'exploitant'
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
export function ImpersonationBanner({ targetName, kind }: Props) {
  const locale = useLocale()
  const t = useTranslations('impersonation')

  async function handleExit() {
    await stopImpersonation(locale)
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950 shadow-md"
    >
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {kind === 'exploitant' ? t('connectedAsExploitant') : t('connectedAs')}{' '}
          <strong>{targetName}</strong>
        </span>
      </div>
      {kind === 'exploitant' ? (
        <form action={handleExit}>
          <button
            type="submit"
            className="whitespace-nowrap rounded-md bg-amber-600 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {t('exit')}
          </button>
        </form>
      ) : (
        <a
          href={`/${locale}/admin`}
          className="whitespace-nowrap rounded-md bg-amber-600 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {t('exit')}
        </a>
      )}
    </div>
  )
}
