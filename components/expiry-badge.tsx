import { Badge } from '@/components/ui/badge'
import { computeAlertSeverity } from '@/lib/regulatory/alerts'

interface ExpiryBadgeProps {
  date: Date
  type: 'CAMO' | 'BFCL'
}

const severityConfig = {
  OK: { label: 'Valide', className: 'bg-green-100 text-green-800 border-green-200' },
  WARNING: { label: 'Attention', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  CRITICAL: { label: 'Critique', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  EXPIRED: { label: 'Expiré', className: 'bg-red-100 text-red-800 border-red-200' },
}

export function ExpiryBadge({ date, type }: ExpiryBadgeProps) {
  const severity = computeAlertSeverity(date, type)
  const { label, className } = severityConfig[severity]
  const dateStr = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <Badge variant="outline" className={className}>
      {label} — {dateStr}
    </Badge>
  )
}
