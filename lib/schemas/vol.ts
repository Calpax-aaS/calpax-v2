import { z } from 'zod'

export const volCreateSchema = z.object({
  date: z.coerce.date(),
  creneau: z.enum(['MATIN', 'SOIR']),
  ballonId: z.string().min(1, 'Ballon requis'),
  piloteId: z.string().min(1, 'Pilote requis'),
  equipier: z.string().optional().or(z.literal('')),
  vehicule: z.string().optional().or(z.literal('')),
  lieuDecollage: z.string().optional().or(z.literal('')),
  configGaz: z.string().optional().or(z.literal('')),
  qteGaz: z.coerce.number().int().positive().optional(),
})

export type VolCreateFormData = z.infer<typeof volCreateSchema>
