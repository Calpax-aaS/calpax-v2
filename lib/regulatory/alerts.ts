export type AlertSeverity = 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'OK'
export type AlertType = 'CAMO_EXPIRY' | 'BFCL_EXPIRY'

export type Alert = {
  severity: AlertSeverity
  entityType: 'BALLON' | 'PILOTE'
  entityId: string
  entityName: string
  alertType: AlertType
  expiryDate: Date
  daysRemaining: number
}

type BallonInput = {
  id: string
  nom?: string
  immatriculation: string
  camoExpiryDate: Date | null
  actif: boolean
}

type PiloteInput = {
  id: string
  prenom: string
  nom: string
  dateExpirationLicence: Date
  actif: boolean
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  EXPIRED: 0,
  CRITICAL: 1,
  WARNING: 2,
  OK: 3,
}

/**
 * Compute number of full days remaining until expiryDate (from today).
 * Returns 0 if expiry is today, negative if already expired.
 */
function computeDaysRemaining(expiryDate: Date, today: Date): number {
  const todayMs = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const expiryMs = Date.UTC(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate())
  return Math.round((expiryMs - todayMs) / (1000 * 60 * 60 * 24))
}

/**
 * Compute alert severity for a given expiry date and certificate type.
 *
 * CAMO thresholds: WARNING 31-60 days, CRITICAL 1-30 days, EXPIRED <= 0
 * BFCL thresholds: WARNING 31-90 days, CRITICAL 1-30 days, EXPIRED <= 0
 */
export function computeAlertSeverity(
  expiryDate: Date,
  type: 'CAMO' | 'BFCL',
  today: Date = new Date(),
): AlertSeverity {
  const days = computeDaysRemaining(expiryDate, today)

  if (days <= 0) return 'EXPIRED'
  if (days <= 30) return 'CRITICAL'

  const warningThreshold = type === 'BFCL' ? 90 : 60
  if (days <= warningThreshold) return 'WARNING'

  return 'OK'
}

/**
 * Build alerts for a list of ballons based on CAMO expiry.
 * Skips inactive ballons and those with no camoExpiryDate.
 * Only returns alerts with severity != OK.
 */
export function buildBallonAlerts(ballons: BallonInput[], today: Date = new Date()): Alert[] {
  return ballons.flatMap((ballon) => {
    if (!ballon.actif || ballon.camoExpiryDate === null) return []

    const severity = computeAlertSeverity(ballon.camoExpiryDate, 'CAMO', today)
    if (severity === 'OK') return []

    const alert: Alert = {
      severity,
      entityType: 'BALLON',
      entityId: ballon.id,
      entityName: ballon.nom ? `${ballon.nom} (${ballon.immatriculation})` : ballon.immatriculation,
      alertType: 'CAMO_EXPIRY',
      expiryDate: ballon.camoExpiryDate,
      daysRemaining: computeDaysRemaining(ballon.camoExpiryDate, today),
    }
    return [alert]
  })
}

/**
 * Build alerts for a list of pilotes based on BFCL licence expiry.
 * Skips inactive pilotes.
 * Only returns alerts with severity != OK.
 */
export function buildPiloteAlerts(pilotes: PiloteInput[], today: Date = new Date()): Alert[] {
  return pilotes.flatMap((pilote) => {
    if (!pilote.actif) return []

    const severity = computeAlertSeverity(pilote.dateExpirationLicence, 'BFCL', today)
    if (severity === 'OK') return []

    const alert: Alert = {
      severity,
      entityType: 'PILOTE',
      entityId: pilote.id,
      entityName: `${pilote.prenom} ${pilote.nom}`,
      alertType: 'BFCL_EXPIRY',
      expiryDate: pilote.dateExpirationLicence,
      daysRemaining: computeDaysRemaining(pilote.dateExpirationLicence, today),
    }
    return [alert]
  })
}

/**
 * Sort alerts: EXPIRED first, then CRITICAL, then WARNING.
 * Returns a new array — does not mutate the input.
 */
export function sortAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}
