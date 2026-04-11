import { z } from 'zod'

/**
 * Zod schema for Ballon form data.
 * Uses z.coerce for numbers and dates (they arrive as strings from FormData).
 */
export const ballonSchema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  immatriculation: z.string().min(1, 'Immatriculation requise'),
  volumeM3: z.coerce.number().int().positive('Volume requis'),
  nbPassagerMax: z.coerce.number().int().positive('Nombre de passagers invalide'),
  peseeAVide: z.coerce.number().int().positive('Pesée à vide invalide'),
  configGaz: z.string().min(1, 'Configuration gaz requise'),
  manexAnnexRef: z.string().min(1, 'Référence annexe MANEX requise'),
  mtom: z.coerce.number().int().positive().optional(),
  mlm: z.coerce.number().int().positive().optional(),
  performanceChart: z.record(z.string(), z.coerce.number()),
  camoOrganisme: z.string().optional(),
  camoExpiryDate: z.coerce.date().optional(),
  certificatNavigabilite: z.string().optional(),
})

export type BallonFormData = z.infer<typeof ballonSchema>
