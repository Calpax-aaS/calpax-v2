import { z } from 'zod'

/**
 * Zod schema for Pilote form data.
 * Uses z.coerce for numbers and dates (they arrive as strings from FormData).
 * Note: poids is validated here as a number; encryption happens at the persistence layer.
 */
export const piloteSchema = z.object({
  prenom: z.string().min(1, 'Prénom requis'),
  nom: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide').optional(),
  telephone: z.string().optional(),
  poids: z.coerce.number().positive('Poids invalide').optional(),
  licenceBfcl: z.string().min(1, 'Numéro de licence BFCL requis'),
  qualificationCommerciale: z.coerce.boolean(),
  dateExpirationLicence: z.coerce.date({ error: 'Date expiration licence invalide' }),
  classesBallon: z.array(z.string()).min(1, 'Au moins une classe de ballon requise'),
  heuresDeVol: z.coerce.number().int().nonnegative().optional(),
})

export type PiloteFormData = z.infer<typeof piloteSchema>
