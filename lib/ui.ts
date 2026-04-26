import type { StatutBillet, StatutPaiement, StatutVol } from '@prisma/client'

export const formLabelClass = 'text-xs font-medium uppercase tracking-wider text-muted-foreground'

export type BadgeVariant = 'outline' | 'default' | 'secondary' | 'destructive'

export function statutBilletVariant(statut: StatutBillet): BadgeVariant {
  switch (statut) {
    case 'EN_ATTENTE':
      return 'outline'
    case 'PLANIFIE':
      return 'default'
    case 'VOLE':
      return 'secondary'
    case 'ANNULE':
    case 'REMBOURSE':
    case 'EXPIRE':
      return 'destructive'
    default:
      return 'outline'
  }
}

export function statutPaiementVariant(statut: StatutPaiement): BadgeVariant {
  switch (statut) {
    case 'EN_ATTENTE':
      return 'outline'
    case 'SOLDE':
      return 'default'
    case 'PARTIEL':
      return 'secondary'
    case 'REMBOURSE':
      return 'destructive'
    default:
      return 'outline'
  }
}

export function statutVolVariant(statut: StatutVol): BadgeVariant {
  switch (statut) {
    case 'PLANIFIE':
    case 'CONFIRME':
      return 'default'
    case 'TERMINE':
      return 'secondary'
    case 'ARCHIVE':
      return 'outline'
    case 'ANNULE':
      return 'destructive'
    default:
      return 'outline'
  }
}
