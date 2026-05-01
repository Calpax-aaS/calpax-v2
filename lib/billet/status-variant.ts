import type { StatutBillet, StatutPaiement } from '@prisma/client'

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
