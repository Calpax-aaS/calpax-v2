import type { Alert, AlertSeverity } from '@/lib/regulatory/alerts'

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  EXPIRED: 'bg-destructive/10 text-destructive border-destructive/20',
  CRITICAL: 'bg-warning/10 text-warning border-warning/20',
  WARNING: 'bg-accent text-accent-foreground border-accent-foreground/20',
  OK: 'hidden',
}

function formatDaysRemaining(daysRemaining: number): string {
  if (daysRemaining <= 0) return 'EXPIRE'
  if (daysRemaining === 1) return '1 jour restant'
  return `${daysRemaining} jours restants`
}

/**
 * Renders a compact banner for EXPIRED/CRITICAL alerts only.
 * WARNING alerts are visible only via the sidebar badge counter.
 * Receives pre-computed alerts from the layout (no DB query here).
 */
export function AlertsBanner({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null

  return (
    <div className="flex flex-col gap-2 px-4 pt-4">
      {alerts.map((alert) => (
        <div
          key={`${alert.entityType}-${alert.entityId}-${alert.alertType}`}
          className={`flex items-center justify-between rounded-md border px-4 py-2 text-sm ${SEVERITY_STYLES[alert.severity]}`}
        >
          <span>
            <strong>{alert.entityName}</strong> —{' '}
            {alert.alertType === 'CAMO_EXPIRY' ? 'CAMO' : 'BFCL'}
          </span>
          <span className="font-medium">{formatDaysRemaining(alert.daysRemaining)}</span>
        </div>
      ))}
    </div>
  )
}
