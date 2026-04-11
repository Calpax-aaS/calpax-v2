import { z } from 'zod'

export const paiementCreateSchema = z.object({
  modePaiement: z.enum(['ESPECES', 'CHEQUE', 'CB', 'VIREMENT', 'CHEQUE_VACANCES', 'AVOIR']),
  montantTtc: z.coerce.number().int('Montant invalide'),
  datePaiement: z.coerce.date(),
  dateEncaissement: z.coerce.date().optional(),
  commentaire: z.string().optional().or(z.literal('')),
})

export type PaiementFormData = z.infer<typeof paiementCreateSchema>
