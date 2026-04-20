'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Chip } from '@/components/cockpit/chip'
import type { Alert, AlertSeverity } from '@/lib/regulatory/alerts'

const SEVERITY_VARIANT: Record<AlertSeverity, 'destructive' | 'critical' | 'warning' | 'outline'> =
  {
    EXPIRED: 'destructive',
    CRITICAL: 'critical',
    WARNING: 'warning',
    OK: 'outline',
  }

/**
 * Bandeau d'alertes reglementaires ("RegAlertBar" cockpit): bande pleine
 * largeur sous la topbar, icone + comptage + chips severite + CTA. Ouvre
 * une Sheet detaillee au clic.
 */
export function AlertsBanner({ alerts }: { alerts: Alert[] }) {
  const t = useTranslations('alerts')
  const [open, setOpen] = useState(false)

  if (alerts.length === 0) return null

  const hasExpired = alerts.some((a) => a.severity === 'EXPIRED')
  const expiredCount = alerts.filter((a) => a.severity === 'EXPIRED').length
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length
  const tone = hasExpired ? 'danger' : 'warn'
  const barStyle = hasExpired
    ? 'border-b border-[#f3c7c7] bg-[#fbe6e6] text-[#7a1717]'
    : 'border-b border-[#f3dcaf] bg-[#fdf1d8] text-[#8a5300]'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex w-full items-center gap-3 px-5 py-2.5 text-left text-xs transition-colors hover:brightness-95 ${barStyle}`}
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="font-semibold">{t('count', { count: alerts.length })}</span>
        <div className="flex shrink-0 gap-1.5">
          {expiredCount > 0 && (
            <Chip tone="danger" size="sm">
              {t('countExpired', { count: expiredCount })}
            </Chip>
          )}
          {criticalCount > 0 && (
            <Chip tone={tone} size="sm">
              {t('countCritical', { count: criticalCount })}
            </Chip>
          )}
        </div>
        <span className="ml-auto flex items-center gap-1 text-[11px] font-medium opacity-80">
          {t('viewAll')}
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t('title')}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-3">
            {alerts.map((alert) => (
              <div
                key={`${alert.entityType}-${alert.entityId}-${alert.alertType}`}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{alert.entityName}</span>
                  <span className="text-xs text-muted-foreground">
                    {alert.alertType === 'CAMO_EXPIRY' ? t('camoExpiry') : t('bfclExpiry')}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={SEVERITY_VARIANT[alert.severity]}>
                    {alert.severity === 'EXPIRED' ? t('expired') : t('critical')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {t('daysRemaining', { days: Math.max(0, alert.daysRemaining) })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
