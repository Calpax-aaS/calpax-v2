import { z } from 'zod'
import { passagerSchema } from './passager'

export const billetCreateSchema = z.object({
  typePlannif: z.enum(['MATIN', 'SOIR', 'TOUTE_LA_JOURNEE', 'AU_PLUS_VITE', 'AUTRE', 'A_DEFINIR']),
  dateVolDeb: z.coerce.date().optional(),
  dateVolFin: z.coerce.date().optional(),
  dateValidite: z.coerce.date().optional(),

  payeurCiv: z.string().optional().or(z.literal('')),
  payeurPrenom: z.string().min(1, 'Prenom payeur requis'),
  payeurNom: z.string().min(1, 'Nom payeur requis'),
  payeurEmail: z.string().email('Email invalide').optional().or(z.literal('')),
  payeurTelephone: z.string().optional().or(z.literal('')),
  payeurAdresse: z.string().optional().or(z.literal('')),
  payeurCp: z.string().optional().or(z.literal('')),
  payeurVille: z.string().optional().or(z.literal('')),

  montantTtc: z.coerce.number().nonnegative('Montant invalide'),
  categorie: z.string().optional().or(z.literal('')),
  provenance: z.string().optional().or(z.literal('')),
  lieuDecollage: z.string().optional().or(z.literal('')),
  survol: z.string().optional().or(z.literal('')),
  commentaire: z.string().optional().or(z.literal('')),
  dateRappel: z.coerce.date().optional(),

  passagers: z.array(passagerSchema).min(1, 'Au moins un passager requis'),
})

export type BilletFormData = z.infer<typeof billetCreateSchema>
