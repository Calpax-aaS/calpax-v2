import {
  isBallonFlightReady,
  isPiloteAssignable,
  getBallonGroupe,
} from '@/lib/regulatory/validation'

type BallonInput = {
  id: string
  actif: boolean
  camoExpiryDate: Date | null
  volumeM3: number
}

type PiloteInput = {
  id: string
  actif: boolean
  dateExpirationLicence: Date
  qualificationCommerciale: boolean
  classeA: boolean
  groupeA1?: boolean
  groupeA2?: boolean
  groupeA3?: boolean
  groupeA4?: boolean
}

type ExistingVol = {
  ballonId: string
  piloteId: string
  creneau: string
}

type VolCreateValidation = { valid: true } | { valid: false; errors: string[] }

export function validateVolCreation(input: {
  ballon: BallonInput
  pilote: PiloteInput
  date: Date
  creneau: string
  existingVols: ExistingVol[]
}): VolCreateValidation {
  const errors: string[] = []

  const ballonResult = isBallonFlightReady(input.ballon)
  if (!ballonResult.valid) errors.push(ballonResult.reason)

  const groupe = getBallonGroupe(input.ballon.volumeM3)
  const piloteResult = isPiloteAssignable(input.pilote, groupe)
  if (!piloteResult.valid) errors.push(piloteResult.reason)

  const ballonConflict = input.existingVols.some(
    (v) => v.ballonId === input.ballon.id && v.creneau === input.creneau,
  )
  if (ballonConflict) errors.push('Ce ballon est deja affecte a ce creneau')

  const piloteConflict = input.existingVols.some(
    (v) => v.piloteId === input.pilote.id && v.creneau === input.creneau,
  )
  if (piloteConflict) errors.push('Ce pilote est deja affecte a ce creneau')

  return errors.length > 0 ? { valid: false, errors } : { valid: true }
}
