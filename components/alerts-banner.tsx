'use client'

import { useState } from 'react'
import { AlertTriangle, ChevronRight, X } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import type { Alert, AlertSeverity } from '@/lib/regulatory/alerts'

const SEVERITY_VARIANT: Record<AlertSeverity, 'destructive' | 'critical' | 'warning' | 'outline'> =
  {
    EXPIRED: 'destructive',
    CRITICAL: 'critical',
    WARNING: 'warning',
    OK: 'outline',
  }

function formatDaysRemaining(daysRemaining: number): string {
  if (daysRemaining <= 0) return 'Expiré'
  if (daysRemaining === 1) return '1 jour'
  return `${daysRemaining} jours`
}

function summaryLabel(alerts: Alert[]): string {
  const expired = alerts.filter((a) => a.severity === 'EXPIRED').length
  const critical = alerts.filter((a) => a.severity === 'CRITICAL').length

  const parts: string[] = []
  if (expired > 0) parts.push(`${expired} expirée${expired > 1 ? 's' : ''}`)
  if (critical > 0) parts.push(`${critical} critique${critical > 1 ? 's' : ''}`)

  return `${alerts.length} alerte${alerts.length > 1 ? 's' : ''} réglementaire${alerts.length > 1 ? 's' : ''} (${parts.join(', ')})`
}

/**
 * Single-line alert summary that opens a Sheet with full details.
 * Only shows EXPIRED and CRITICAL alerts (WARNING is sidebar-only).
 */
export function AlertsBanner({ alerts }: { alerts: Alert[] }) {
  const [open, setOpen] = useState(false)

  if (alerts.length === 0) return null

  const hasExpired = alerts.some((a) => a.severity === 'EXPIRED')

  return (
    <>
      <div className="px-4 pt-4">
        <button
          onClick={() => setOpen(true)}
          className={`flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
            hasExpired
              ? 'border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10'
              : 'border-warning/30 bg-warning/5 text-warning hover:bg-warning/10'
          }`}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left font-medium">{summaryLabel(alerts)}</span>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Alertes réglementaires</SheetTitle>
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
                    {alert.alertType === 'CAMO_EXPIRY' ? 'Certificat CAMO' : 'Licence BFCL'}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={SEVERITY_VARIANT[alert.severity]}>
                    {alert.severity === 'EXPIRED' ? 'Expiré' : 'Critique'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDaysRemaining(alert.daysRemaining)}
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
