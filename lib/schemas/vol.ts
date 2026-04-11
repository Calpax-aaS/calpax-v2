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

export const volPostFlightSchema = z.object({
  decoLieu: z.string().min(1, 'Lieu de decollage requis'),
  decoHeure: z.coerce.date(),
  atterLieu: z.string().min(1, "Lieu d'atterrissage requis"),
  atterHeure: z.coerce.date(),
  gasConso: z.coerce.number().int().nonnegative().optional(),
  distance: z.coerce.number().int().nonnegative().optional(),
  anomalies: z.string().optional().or(z.literal('')),
  noteDansCarnet: z.coerce.boolean().default(true),
})

export type VolPostFlightFormData = z.infer<typeof volPostFlightSchema>
