import { z } from 'zod'

export const passagerSchema = z.object({
  prenom: z.string().min(1, 'Prenom requis'),
  nom: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  telephone: z.string().optional().or(z.literal('')),
  age: z.coerce.number().int().positive('Age invalide').optional(),
  poids: z.coerce.number().positive('Poids invalide').optional(),
  pmr: z.coerce.boolean().default(false),
})

export type PassagerFormData = z.infer<typeof passagerSchema>
