import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { buildBallonAlerts, buildPiloteAlerts, sortAlerts } from '@/lib/regulatory/alerts'
import type { Alert, AlertSeverity } from '@/lib/regulatory/alerts'

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  EXPIRED: 'bg-red-50 border-red-200 text-red-800',
  CRITICAL: 'bg-orange-50 border-orange-200 text-orange-800',
  WARNING: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  OK: '',
}

function formatDaysRemaining(daysRemaining: number): string {
  if (daysRemaining <= 0) return 'EXPIRE'
  if (daysRemaining === 1) return '1 jour restant'
  return `${daysRemaining} jours restants`
}

function AlertItem({ alert }: { alert: Alert }) {
  const styles = SEVERITY_STYLES[alert.severity]
  const certType = alert.alertType === 'CAMO_EXPIRY' ? 'CAMO' : 'BFCL'

  return (
    <div
      className={`flex items-center justify-between rounded-md border px-4 py-2 text-sm ${styles}`}
    >
      <span>
        <strong>{alert.entityName}</strong> — {certType}
      </span>
      <span className="font-medium">{formatDaysRemaining(alert.daysRemaining)}</span>
    </div>
  )
}

/**
 * Server component that fetches CAMO and BFCL expiry alerts for the current tenant
 * and renders colored banners. Renders nothing if no alerts are active.
 */
export async function AlertsBanner() {
  const alerts = await requireAuth(async () => {
    const today = new Date()

    const [ballons, pilotes] = await Promise.all([
      db.ballon.findMany({
        where: { actif: true },
        select: { id: true, immatriculation: true, camoExpiryDate: true, actif: true },
      }),
      db.pilote.findMany({
        where: { actif: true },
        select: {
          id: true,
          prenom: true,
          nom: true,
          dateExpirationLicence: true,
          actif: true,
        },
      }),
    ])

    const ballonAlerts = buildBallonAlerts(ballons, today)
    const piloteAlerts = buildPiloteAlerts(pilotes, today)

    return sortAlerts([...ballonAlerts, ...piloteAlerts])
  })

  if (alerts.length === 0) return null

  return (
    <div className="flex flex-col gap-2 px-4 pt-4">
      {alerts.map((alert) => (
        <AlertItem key={`${alert.entityType}-${alert.entityId}-${alert.alertType}`} alert={alert} />
      ))}
    </div>
  )
}
