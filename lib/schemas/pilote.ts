import { z } from 'zod'

const coerceCheckbox = z
  .union([z.boolean(), z.string(), z.null()])
  .transform((v) => v === true || v === 'on' || v === 'true')

export const piloteSchema = z.object({
  prenom: z.string().min(1, 'Prénom requis'),
  nom: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  telephone: z.string().optional(),
  poids: z.coerce.number().positive('Poids invalide').optional(),
  licenceBfcl: z.string().min(1, 'Numéro de licence BFCL requis'),
  dateExpirationLicence: z.coerce.date({ message: "Date d'expiration de licence requise" }),
  heuresDeVol: z.coerce.number().int().nonnegative().optional(),

  // BFCL.200 classes
  classeA: coerceCheckbox.default(false),
  classeB: coerceCheckbox.default(false),
  classeC: coerceCheckbox.default(false),
  classeD: coerceCheckbox.default(false),

  // BFCL.200 groupes (classe A)
  groupeA1: coerceCheckbox.default(false),
  groupeA2: coerceCheckbox.default(false),
  groupeA3: coerceCheckbox.default(false),
  groupeA4: coerceCheckbox.default(false),

  // Qualifications
  qualificationCommerciale: coerceCheckbox.default(false),
  qualificationNuit: coerceCheckbox.default(false),
  qualificationInstructeur: coerceCheckbox.default(false),
  qualificationCaptif: coerceCheckbox.default(false),
})

export type PiloteFormData = z.infer<typeof piloteSchema>
