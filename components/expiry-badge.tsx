import { Badge } from '@/components/ui/badge'
import { computeAlertSeverity } from '@/lib/regulatory/alerts'

interface ExpiryBadgeProps {
  date: Date
  type: 'CAMO' | 'BFCL'
}

const severityConfig: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'critical' | 'destructive' | 'outline' }
> = {
  OK: { label: 'Valide', variant: 'success' },
  WARNING: { label: 'Attention', variant: 'warning' },
  CRITICAL: { label: 'Critique', variant: 'critical' },
  EXPIRED: { label: 'Expiré', variant: 'destructive' },
}

export function ExpiryBadge({ date, type }: ExpiryBadgeProps) {
  const severity = computeAlertSeverity(date, type)
  const { label, variant } = severityConfig[severity] ?? {
    label: severity,
    variant: 'outline' as const,
  }
  const dateStr = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <Badge variant={variant}>
      {label} — {dateStr}
    </Badge>
  )
}
