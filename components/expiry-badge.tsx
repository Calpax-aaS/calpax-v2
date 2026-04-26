import { getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { computeAlertSeverity } from '@/lib/regulatory/alerts'
import { formatDateFr } from '@/lib/format'

interface ExpiryBadgeProps {
  date: Date
  type: 'CAMO' | 'BFCL'
}

const severityConfig: Record<
  string,
  {
    labelKey: 'valid' | 'warning' | 'critical' | 'expired'
    variant: 'success' | 'warning' | 'critical' | 'destructive'
  }
> = {
  OK: { labelKey: 'valid', variant: 'success' },
  WARNING: { labelKey: 'warning', variant: 'warning' },
  CRITICAL: { labelKey: 'critical', variant: 'critical' },
  EXPIRED: { labelKey: 'expired', variant: 'destructive' },
}

export async function ExpiryBadge({ date, type }: ExpiryBadgeProps) {
  const t = await getTranslations('alerts')
  const severity = computeAlertSeverity(date, type)
  const config = severityConfig[severity]
  const label = config ? t(config.labelKey) : severity
  const variant = config?.variant ?? 'outline'

  return (
    <Badge variant={variant}>
      {label} — {formatDateFr(date)}
    </Badge>
  )
}
