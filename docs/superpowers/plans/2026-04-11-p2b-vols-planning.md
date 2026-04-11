# P2b — Vols, Planning, Organisation, Devis de Masse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the flight lifecycle — vol creation with regulatory validation, weekly planning grid (7 days x 2 slots), billet-to-vol assignment, and temperature-aware devis de masse calculation.

**Architecture:** New Prisma models (Vol + enums, Passager.volId FK). Vol creation validates pilot licence and balloon CAMO via P1 helpers. Devis de masse is a pure function using the balloon's performanceChart. Planning is a custom week grid (not FullCalendar). Organisation page is a two-column layout: available billets on the left, vol with live devis on the right.

**Tech Stack:** Prisma, Zod, Next.js server actions + server components, shadcn/ui, next-intl, lib/regulatory/validation (P1), lib/crypto (poids decryption).

**Spec:** `docs/superpowers/specs/2026-04-11-p2-flight-lifecycle-design.md` sections 3.5, 5.1–5.6.

---

## File Map

| File                                              | Responsibility                                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                            | Add Vol model, StatutVol + Creneau enums, volId FK on Passager, relations on Exploitant/Ballon/Pilote |
| `lib/db/tenant-extension.ts`                      | Add Vol to TENANT_FILTER                                                                              |
| `tests/integration/helpers.ts`                    | Update resetDb with vol table                                                                         |
| `lib/vol/validation.ts`                           | validateVolCreation pure function                                                                     |
| `lib/vol/devis-masse.ts`                          | calculerDevisMasse pure function                                                                      |
| `lib/schemas/vol.ts`                              | Zod schema for vol create                                                                             |
| `lib/actions/vol.ts`                              | Server actions: createVol, updateVol, cancelVol                                                       |
| `lib/actions/organisation.ts`                     | Server actions: affecterBillet, desaffecterPassager, confirmerVol                                     |
| `app/[locale]/(app)/vols/page.tsx`                | Planning semaine (week grid)                                                                          |
| `app/[locale]/(app)/vols/create/page.tsx`         | Vol creation form                                                                                     |
| `app/[locale]/(app)/vols/[id]/page.tsx`           | Vol detail page                                                                                       |
| `app/[locale]/(app)/vols/[id]/organiser/page.tsx` | Organisation page (assign billets to vol)                                                             |
| `components/week-grid.tsx`                        | Reusable week planning grid component                                                                 |
| `components/devis-masse-live.tsx`                 | Live devis de masse display component                                                                 |
| `components/app-sidebar.tsx`                      | Add Vols nav item                                                                                     |
| `messages/fr.json`                                | French translations for vols                                                                          |
| `messages/en.json`                                | English translations for vols                                                                         |
| `tests/unit/vol-validation.spec.ts`               | Unit tests for vol creation validation                                                                |
| `tests/unit/devis-masse.spec.ts`                  | Unit tests with Cameron Balloons test vectors                                                         |
| `tests/integration/vol-tenant.spec.ts`            | Tenant isolation for Vol                                                                              |

---

### Task 1: Prisma schema — Vol model + enums + Passager.volId

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enums**

Add after existing ModePaiement enum:

```prisma
enum StatutVol {
  PLANIFIE
  CONFIRME
  TERMINE
  ARCHIVE
  ANNULE
}

enum Creneau {
  MATIN
  SOIR
}
```

- [ ] **Step 2: Add Vol model**

```prisma
model Vol {
  id              String     @id @default(cuid())
  exploitantId    String
  exploitant      Exploitant @relation(fields: [exploitantId], references: [id], onDelete: Cascade)

  date            DateTime   @db.Date
  creneau         Creneau
  statut          StatutVol  @default(PLANIFIE)

  ballonId        String
  ballon          Ballon     @relation(fields: [ballonId], references: [id])
  piloteId        String
  pilote          Pilote     @relation(fields: [piloteId], references: [id])
  equipier        String?
  vehicule        String?

  configGaz       String?
  qteGaz          Int?

  lieuDecollage   String?

  decoLieu        String?
  decoHeure       DateTime?
  atterLieu       String?
  atterHeure      DateTime?
  distance        Int?
  gasConso        Int?
  anomalies       String?
  noteDansCarnet  Boolean    @default(false)

  pvePdfUrl       String?
  pveArchivedAt   DateTime?

  passagers       Passager[]

  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  @@unique([exploitantId, date, creneau, ballonId])
  @@index([exploitantId])
  @@index([exploitantId, date])
  @@map("vol")
}
```

- [ ] **Step 3: Add volId FK to Passager**

Add to the Passager model:

```prisma
  volId           String?
  vol             Vol?       @relation(fields: [volId], references: [id])
```

And add `@@index([volId])` to Passager.

- [ ] **Step 4: Add relations to existing models**

Add to Exploitant: `vols Vol[]`
Add to Ballon: `vols Vol[]`
Add to Pilote: `vols Vol[]`

- [ ] **Step 5: Run migration**

```bash
npx prisma migrate dev --name p2b-vol
npx prisma generate
```

- [ ] **Step 6: Commit**

```bash
git add prisma/
git commit -m "feat(prisma): p2b schema — vol model, statut/creneau enums, passager volId FK"
```

---

### Task 2: Tenant isolation + test helpers

**Files:**

- Modify: `lib/db/tenant-extension.ts`
- Modify: `tests/integration/helpers.ts`

- [ ] **Step 1: Add Vol to TENANT_FILTER**

In `lib/db/tenant-extension.ts`, add to TENANT_FILTER:

```ts
  Vol: 'exploitantId',
```

- [ ] **Step 2: Update resetDb**

In `tests/integration/helpers.ts`, add `await basePrisma.vol.deleteMany({})` BEFORE the paiement delete (vol must be deleted before passager due to the FK). New order at the top:

```ts
await basePrisma.vol.deleteMany({})
await basePrisma.paiement.deleteMany({})
await basePrisma.passager.deleteMany({})
// ... rest unchanged
```

- [ ] **Step 3: Verify existing tests pass**

```bash
npx vitest run tests/integration/ --config vitest.integration.config.ts --reporter=verbose
```

- [ ] **Step 4: Commit**

```bash
git add lib/db/tenant-extension.ts tests/integration/helpers.ts
git commit -m "feat(db): extend tenant isolation for vol"
```

---

### Task 3: Vol creation validation (TDD)

**Files:**

- Create: `lib/vol/validation.ts`
- Create: `tests/unit/vol-validation.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/vol-validation.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validateVolCreation } from '@/lib/vol/validation'

const validBallon = {
  id: 'b1',
  actif: true,
  camoExpiryDate: new Date('2027-01-01'),
  volumeM3: 3000,
}

const validPilote = {
  id: 'p1',
  actif: true,
  dateExpirationLicence: new Date('2027-01-01'),
  qualificationCommerciale: true,
  classeA: true,
  groupeA1: true,
  groupeA2: false,
  groupeA3: false,
  groupeA4: false,
}

const baseInput = {
  ballon: validBallon,
  pilote: validPilote,
  date: new Date('2026-06-15'),
  creneau: 'MATIN' as const,
  existingVols: [],
}

describe('validateVolCreation', () => {
  it('returns valid for a correct input', () => {
    const result = validateVolCreation(baseInput)
    expect(result.valid).toBe(true)
  })

  it('rejects when ballon CAMO is expired', () => {
    const result = validateVolCreation({
      ...baseInput,
      ballon: { ...validBallon, camoExpiryDate: new Date('2020-01-01') },
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors).toContain('Certificat CAMO expire')
  })

  it('rejects when ballon is inactive', () => {
    const result = validateVolCreation({
      ...baseInput,
      ballon: { ...validBallon, actif: false },
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors).toContain('Ballon inactif')
  })

  it('rejects when pilote licence is expired', () => {
    const result = validateVolCreation({
      ...baseInput,
      pilote: { ...validPilote, dateExpirationLicence: new Date('2020-01-01') },
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors).toContain('Licence BFCL expiree')
  })

  it('rejects when pilote lacks qualification commerciale', () => {
    const result = validateVolCreation({
      ...baseInput,
      pilote: { ...validPilote, qualificationCommerciale: false },
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors).toContain('Qualification commerciale manquante')
  })

  it('rejects when pilote group does not cover ballon', () => {
    const result = validateVolCreation({
      ...baseInput,
      ballon: { ...validBallon, volumeM3: 5000 },
      pilote: { ...validPilote, groupeA2: false },
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors[0]).toMatch(/groupe/)
  })

  it('rejects duplicate ballon on same date+creneau', () => {
    const result = validateVolCreation({
      ...baseInput,
      existingVols: [{ ballonId: 'b1', piloteId: 'p2', creneau: 'MATIN' }],
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors).toContain('Ce ballon est deja affecte a ce creneau')
  })

  it('rejects duplicate pilote on same creneau', () => {
    const result = validateVolCreation({
      ...baseInput,
      existingVols: [{ ballonId: 'b2', piloteId: 'p1', creneau: 'MATIN' }],
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors).toContain('Ce pilote est deja affecte a ce creneau')
  })

  it('allows same pilote on different creneau', () => {
    const result = validateVolCreation({
      ...baseInput,
      existingVols: [{ ballonId: 'b2', piloteId: 'p1', creneau: 'SOIR' }],
    })
    expect(result.valid).toBe(true)
  })

  it('collects multiple errors', () => {
    const result = validateVolCreation({
      ...baseInput,
      ballon: { ...validBallon, actif: false, camoExpiryDate: new Date('2020-01-01') },
      pilote: { ...validPilote, qualificationCommerciale: false },
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/vol-validation.spec.ts --reporter=verbose
```

- [ ] **Step 3: Implement**

Create `lib/vol/validation.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/vol-validation.spec.ts --reporter=verbose
```

- [ ] **Step 5: Commit**

```bash
git add lib/vol/validation.ts tests/unit/vol-validation.spec.ts
git commit -m "feat(vol): creation validation with regulatory checks + tdd"
```

---

### Task 4: Devis de masse calculation (TDD)

**Files:**

- Create: `lib/vol/devis-masse.ts`
- Create: `tests/unit/devis-masse.spec.ts`

- [ ] **Step 1: Write failing tests with Cameron Balloons test vectors**

Create `tests/unit/devis-masse.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calculerDevisMasse, type DevisMasseInput } from '@/lib/vol/devis-masse'

// F-HFCC (Z-105, 3000 m3) performance chart from seed
const FHFCC_CHART: Record<string, number> = {
  '10': 482,
  '11': 470,
  '12': 458,
  '13': 446,
  '14': 434,
  '15': 422,
  '16': 411,
  '17': 399,
  '18': 388,
  '19': 376,
  '20': 365,
  '21': 354,
  '22': 342,
  '23': 331,
  '24': 320,
  '25': 309,
  '26': 298,
  '27': 288,
  '28': 277,
  '29': 266,
  '30': 256,
  '31': 245,
  '32': 235,
  '33': 224,
  '34': 214,
}

// F-HACK (Z-225, 6400 m3) performance chart from seed
const FHACK_CHART: Record<string, number> = {
  '10': 1093,
  '11': 1067,
  '12': 1041,
  '13': 1016,
  '14': 990,
  '15': 965,
  '16': 940,
  '17': 915,
  '18': 891,
  '19': 866,
  '20': 842,
  '21': 818,
  '22': 794,
  '23': 770,
  '24': 746,
  '25': 723,
  '26': 699,
  '27': 676,
  '28': 653,
  '29': 630,
  '30': 607,
  '31': 585,
  '32': 562,
  '33': 540,
  '34': 518,
}

function makeInput(overrides: Partial<DevisMasseInput> = {}): DevisMasseInput {
  return {
    ballon: {
      peseeAVide: 376,
      performanceChart: FHFCC_CHART,
      configGaz: '4xCB2990 : 4x23 kg',
    },
    pilotePoids: 92,
    passagers: [{ poids: 75 }, { poids: 80 }],
    temperatureCelsius: 20,
    qteGaz: 92,
    ...overrides,
  }
}

describe('calculerDevisMasse', () => {
  it('computes correct totals for F-HFCC at 20C', () => {
    const result = calculerDevisMasse(makeInput())
    expect(result.poidsAVide).toBe(376)
    expect(result.poidsGaz).toBe(92)
    expect(result.poidsPilote).toBe(92)
    expect(result.poidsPassagers).toBe(155)
    expect(result.poidsTotal).toBe(376 + 92 + 92 + 155)
    expect(result.chargeUtileMax).toBe(365)
    expect(result.margeRestante).toBe(365 - (376 + 92 + 92 + 155))
    expect(result.estSurcharge).toBe(true)
    expect(result.temperatureUtilisee).toBe(20)
  })

  it('uses ceiling temperature for interpolation (22.5 -> 23)', () => {
    const result = calculerDevisMasse(makeInput({ temperatureCelsius: 22.5 }))
    expect(result.temperatureUtilisee).toBe(23)
    expect(result.chargeUtileMax).toBe(331)
  })

  it('uses exact temperature when integer', () => {
    const result = calculerDevisMasse(makeInput({ temperatureCelsius: 10 }))
    expect(result.temperatureUtilisee).toBe(10)
    expect(result.chargeUtileMax).toBe(482)
  })

  it('clamps to max temperature (34) when above range', () => {
    const result = calculerDevisMasse(makeInput({ temperatureCelsius: 40 }))
    expect(result.temperatureUtilisee).toBe(34)
    expect(result.chargeUtileMax).toBe(214)
  })

  it('clamps to min temperature (10) when below range', () => {
    const result = calculerDevisMasse(makeInput({ temperatureCelsius: 5 }))
    expect(result.temperatureUtilisee).toBe(10)
    expect(result.chargeUtileMax).toBe(482)
  })

  it('computes F-HACK at 20C with 4 passengers — no surcharge', () => {
    const result = calculerDevisMasse({
      ballon: {
        peseeAVide: 746,
        performanceChart: FHACK_CHART,
        configGaz: '4xCB2903 : 4x36 kg',
      },
      pilotePoids: 92,
      passagers: [{ poids: 75 }, { poids: 80 }, { poids: 70 }, { poids: 65 }],
      temperatureCelsius: 20,
      qteGaz: 144,
    })
    expect(result.poidsAVide).toBe(746)
    expect(result.poidsPassagers).toBe(290)
    expect(result.chargeUtileMax).toBe(842)
    expect(result.poidsTotal).toBe(746 + 144 + 92 + 290)
    expect(result.estSurcharge).toBe(false)
  })

  it('includes equipementSupp in total', () => {
    const result = calculerDevisMasse(makeInput({ equipementSupp: 20 }))
    expect(result.poidsEquipement).toBe(20)
    expect(result.poidsTotal).toBe(376 + 92 + 92 + 155 + 20)
  })

  it('handles zero passengers', () => {
    const result = calculerDevisMasse(makeInput({ passagers: [] }))
    expect(result.poidsPassagers).toBe(0)
    expect(result.poidsTotal).toBe(376 + 92 + 92)
  })

  it('computes F-HFCC at 34C — most restrictive', () => {
    const result = calculerDevisMasse(makeInput({ temperatureCelsius: 34 }))
    expect(result.chargeUtileMax).toBe(214)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/devis-masse.spec.ts --reporter=verbose
```

- [ ] **Step 3: Implement**

Create `lib/vol/devis-masse.ts`:

```ts
export type DevisMasseInput = {
  ballon: {
    peseeAVide: number
    performanceChart: Record<string, number>
    configGaz: string
  }
  pilotePoids: number
  passagers: readonly { poids: number }[]
  temperatureCelsius: number
  qteGaz: number
  equipementSupp?: number
}

export type DevisMasseResult = {
  poidsAVide: number
  poidsGaz: number
  poidsPilote: number
  poidsPassagers: number
  poidsEquipement: number
  poidsTotal: number
  chargeUtileMax: number
  margeRestante: number
  estSurcharge: boolean
  temperatureUtilisee: number
}

function lookupChargeUtileMax(
  chart: Record<string, number>,
  temperatureCelsius: number,
): { chargeUtileMax: number; temperatureUtilisee: number } {
  const temps = Object.keys(chart)
    .map(Number)
    .sort((a, b) => a - b)

  if (temps.length === 0) {
    return { chargeUtileMax: 0, temperatureUtilisee: temperatureCelsius }
  }

  const minTemp = temps[0]!
  const maxTemp = temps[temps.length - 1]!

  if (temperatureCelsius <= minTemp) {
    return { chargeUtileMax: chart[String(minTemp)]!, temperatureUtilisee: minTemp }
  }

  if (temperatureCelsius >= maxTemp) {
    return { chargeUtileMax: chart[String(maxTemp)]!, temperatureUtilisee: maxTemp }
  }

  // Conservative: ceiling temperature (higher temp = lower payload)
  const ceilTemp = temps.find((t) => t >= temperatureCelsius) ?? maxTemp
  return { chargeUtileMax: chart[String(ceilTemp)]!, temperatureUtilisee: ceilTemp }
}

export function calculerDevisMasse(input: DevisMasseInput): DevisMasseResult {
  const poidsAVide = input.ballon.peseeAVide
  const poidsGaz = input.qteGaz
  const poidsPilote = input.pilotePoids
  const poidsPassagers = input.passagers.reduce((sum, p) => sum + p.poids, 0)
  const poidsEquipement = input.equipementSupp ?? 0
  const poidsTotal = poidsAVide + poidsGaz + poidsPilote + poidsPassagers + poidsEquipement

  const { chargeUtileMax, temperatureUtilisee } = lookupChargeUtileMax(
    input.ballon.performanceChart,
    input.temperatureCelsius,
  )

  const margeRestante = chargeUtileMax - poidsTotal

  return {
    poidsAVide,
    poidsGaz,
    poidsPilote,
    poidsPassagers,
    poidsEquipement,
    poidsTotal,
    chargeUtileMax,
    margeRestante,
    estSurcharge: margeRestante < 0,
    temperatureUtilisee,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/devis-masse.spec.ts --reporter=verbose
```

- [ ] **Step 5: Commit**

```bash
git add lib/vol/devis-masse.ts tests/unit/devis-masse.spec.ts
git commit -m "feat(vol): devis de masse temperature-aware calculation with tdd"
```

---

### Task 5: Zod schema + server actions

**Files:**

- Create: `lib/schemas/vol.ts`
- Create: `lib/actions/vol.ts`
- Create: `lib/actions/organisation.ts`

- [ ] **Step 1: Create vol zod schema**

Create `lib/schemas/vol.ts`:

```ts
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
```

- [ ] **Step 2: Create vol server actions**

Create `lib/actions/vol.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { volCreateSchema } from '@/lib/schemas/vol'
import { validateVolCreation } from '@/lib/vol/validation'

export async function createVol(locale: string, formData: FormData): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const ctx = getContext()

    const raw = {
      date: formData.get('date'),
      creneau: formData.get('creneau'),
      ballonId: formData.get('ballonId'),
      piloteId: formData.get('piloteId'),
      equipier: formData.get('equipier') || undefined,
      vehicule: formData.get('vehicule') || undefined,
      lieuDecollage: formData.get('lieuDecollage') || undefined,
      configGaz: formData.get('configGaz') || undefined,
      qteGaz: formData.get('qteGaz') || undefined,
    }

    const result = volCreateSchema.safeParse(raw)
    if (!result.success) {
      const firstError = result.error.issues[0]
      return { error: firstError?.message ?? 'Donnees invalides' }
    }

    const { ballonId, piloteId, date, creneau, ...rest } = result.data

    const [ballon, pilote, existingVols] = await Promise.all([
      db.ballon.findUniqueOrThrow({ where: { id: ballonId } }),
      db.pilote.findUniqueOrThrow({ where: { id: piloteId } }),
      db.vol.findMany({
        where: { date, statut: { not: 'ANNULE' } },
        select: { ballonId: true, piloteId: true, creneau: true },
      }),
    ])

    const validation = validateVolCreation({
      ballon,
      pilote,
      date,
      creneau,
      existingVols: existingVols.map((v) => ({
        ballonId: v.ballonId,
        piloteId: v.piloteId,
        creneau: v.creneau,
      })),
    })

    if (!validation.valid) {
      return { error: validation.errors.join('. ') }
    }

    const vol = await db.vol.create({
      data: {
        ...rest,
        date,
        creneau,
        ballonId,
        piloteId,
        exploitantId: ctx.exploitantId,
        configGaz: rest.configGaz || ballon.configGaz,
      },
    })

    redirect(`/${locale}/vols/${vol.id}`)
  })
}

export async function cancelVol(volId: string, locale: string): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const vol = await db.vol.findUniqueOrThrow({ where: { id: volId } })
    if (vol.statut === 'ARCHIVE') {
      return { error: "Impossible d'annuler un vol archive" }
    }

    // Unassign all passagers and reset their billets
    const passagers = await db.passager.findMany({ where: { volId } })
    const billetIds = [...new Set(passagers.map((p) => p.billetId))]

    await db.passager.updateMany({ where: { volId }, data: { volId: null } })
    for (const billetId of billetIds) {
      await db.billet.update({ where: { id: billetId }, data: { statut: 'EN_ATTENTE' } })
    }

    await db.vol.update({ where: { id: volId }, data: { statut: 'ANNULE' } })

    redirect(`/${locale}/vols`)
  })
}
```

- [ ] **Step 3: Create organisation server actions**

Create `lib/actions/organisation.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'

export async function affecterBillet(
  volId: string,
  billetId: string,
  locale: string,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    await db.passager.updateMany({
      where: { billetId, volId: null },
      data: { volId },
    })

    await db.billet.update({
      where: { id: billetId },
      data: { statut: 'PLANIFIE' },
    })

    revalidatePath(`/${locale}/vols/${volId}/organiser`)
    return {}
  })
}

export async function desaffecterPassager(
  passagerId: string,
  volId: string,
  locale: string,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const passager = await db.passager.findUniqueOrThrow({ where: { id: passagerId } })

    await db.passager.update({
      where: { id: passagerId },
      data: { volId: null },
    })

    // Check if billet still has passagers on this vol
    const remaining = await db.passager.count({
      where: { billetId: passager.billetId, volId },
    })

    if (remaining === 0) {
      await db.billet.update({
        where: { id: passager.billetId },
        data: { statut: 'EN_ATTENTE' },
      })
    }

    revalidatePath(`/${locale}/vols/${volId}/organiser`)
    return {}
  })
}

export async function confirmerVol(volId: string, locale: string): Promise<{ error?: string }> {
  return requireAuth(async () => {
    await db.vol.update({
      where: { id: volId },
      data: { statut: 'CONFIRME' },
    })

    revalidatePath(`/${locale}/vols/${volId}`)
    return {}
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/schemas/vol.ts lib/actions/vol.ts lib/actions/organisation.ts
git commit -m "feat(vol): server actions for vol CRUD + billet organisation"
```

---

### Task 6: i18n + sidebar

**Files:**

- Modify: `messages/fr.json`
- Modify: `messages/en.json`
- Modify: `components/app-sidebar.tsx`

- [ ] **Step 1: Add French translations**

Add to `messages/fr.json` at root level:

```json
"vols": {
  "title": "Planning des vols",
  "new": "Nouveau vol",
  "backToList": "Retour au planning",
  "detail": "Detail du vol",
  "cancel": "Annuler le vol",
  "confirmCancel": "Annuler ce vol ? Les passagers seront desaffectes.",
  "organiser": "Organiser",
  "confirmer": "Confirmer le vol",
  "noVols": "Aucun vol sur cette semaine",
  "week": "Semaine",
  "today": "Aujourd'hui",
  "fields": {
    "date": "Date",
    "creneau": "Creneau",
    "ballon": "Ballon",
    "pilote": "Pilote",
    "equipier": "Equipier",
    "vehicule": "Vehicule",
    "lieuDecollage": "Lieu de decollage",
    "configGaz": "Configuration gaz",
    "qteGaz": "Quantite gaz (kg)",
    "statut": "Statut"
  },
  "creneau": {
    "MATIN": "Matin",
    "SOIR": "Soir"
  },
  "statut": {
    "PLANIFIE": "Planifie",
    "CONFIRME": "Confirme",
    "TERMINE": "Termine",
    "ARCHIVE": "Archive",
    "ANNULE": "Annule"
  },
  "devis": {
    "title": "Devis de masse",
    "temperature": "Temperature (C)",
    "poidsAVide": "Pesee a vide",
    "poidsGaz": "Gaz embarque",
    "poidsPilote": "Pilote",
    "poidsPassagers": "Passagers",
    "poidsEquipement": "Equipement",
    "poidsTotal": "Poids total",
    "chargeUtileMax": "Charge utile max",
    "margeRestante": "Marge restante",
    "conforme": "CONFORME",
    "surcharge": "SURCHARGE"
  },
  "organisation": {
    "title": "Organisation du vol",
    "billetsDisponibles": "Billets disponibles",
    "noBillets": "Aucun billet compatible",
    "affecter": "Affecter",
    "desaffecter": "Retirer",
    "passagersAffectes": "Passagers affectes",
    "noPassagers": "Aucun passager affecte",
    "capacite": "Capacite"
  }
}
```

Add to `nav` section:

```json
"vols": "Vols"
```

- [ ] **Step 2: Add English translations**

Add equivalent to `messages/en.json`:

vols.title = "Flight planning", vols.new = "New flight", vols.backToList = "Back to planning", vols.detail = "Flight detail", vols.cancel = "Cancel flight", vols.confirmCancel = "Cancel this flight? Passengers will be unassigned.", vols.organiser = "Organise", vols.confirmer = "Confirm flight", vols.noVols = "No flights this week", vols.week = "Week", vols.today = "Today"

fields: date = "Date", creneau = "Slot", ballon = "Balloon", pilote = "Pilot", equipier = "Crew", vehicule = "Vehicle", lieuDecollage = "Takeoff location", configGaz = "Gas config", qteGaz = "Gas quantity (kg)", statut = "Status"

creneau: MATIN = "Morning", SOIR = "Evening"

statut: PLANIFIE = "Planned", CONFIRME = "Confirmed", TERMINE = "Completed", ARCHIVE = "Archived", ANNULE = "Cancelled"

devis: title = "Load sheet", temperature = "Temperature (C)", poidsAVide = "Empty weight", poidsGaz = "Gas loaded", poidsPilote = "Pilot", poidsPassagers = "Passengers", poidsEquipement = "Equipment", poidsTotal = "Total weight", chargeUtileMax = "Max payload", margeRestante = "Remaining margin", conforme = "COMPLIANT", surcharge = "OVERLOADED"

organisation: title = "Flight organisation", billetsDisponibles = "Available tickets", noBillets = "No matching tickets", affecter = "Assign", desaffecter = "Remove", passagersAffectes = "Assigned passengers", noPassagers = "No passengers assigned", capacite = "Capacity"

nav: vols = "Flights"

- [ ] **Step 3: Add Vols to sidebar**

In `components/app-sidebar.tsx`, import `Plane` from lucide-react and add nav item after `billets`:

```ts
{
  key: 'vols' as const,
  href: `/${locale}/vols`,
  icon: Plane,
},
```

Final nav order: home, ballons, pilotes, billets, **vols**, settings, rgpd.

- [ ] **Step 4: Commit**

```bash
git add messages/fr.json messages/en.json components/app-sidebar.tsx
git commit -m "feat(i18n): vols translations + sidebar nav item"
```

---

### Task 7: Planning semaine (week grid)

**Files:**

- Create: `components/week-grid.tsx`
- Create: `app/[locale]/(app)/vols/page.tsx`

- [ ] **Step 1: Create week grid component**

Create `components/week-grid.tsx` — a client component that renders 7 columns x 2 rows (matin/soir). Accepts a `weekStart` (Monday Date) and `vols` array. Each cell shows vol cards or a "+" button.

Key implementation:

- Props: `weekStart: Date`, `vols: VolSummary[]`, `locale: string`
- `VolSummary` type: `{ id, date, creneau, ballonNom, piloteInitiales, passagerCount, nbPassagerMax, statut }`
- Grid uses CSS grid: `grid-cols-7` with a fixed left label column for MATIN/SOIR
- Each cell filters vols by matching date + creneau
- Vol card has background color by statut (blue=PLANIFIE, green=CONFIRME, gold=TERMINE, grey=ANNULE)
- Empty cells show a Link "+" to `/${locale}/vols/create?date={date}&creneau={creneau}`
- Week navigation: prev/next week buttons, "Today" button

- [ ] **Step 2: Create planning page**

Create `app/[locale]/(app)/vols/page.tsx` — server component that:

- Reads `?week=YYYY-MM-DD` from searchParams (defaults to current week's Monday)
- Computes weekStart (Monday) and weekEnd (Sunday)
- Queries `db.vol.findMany({ where: { date: { gte: weekStart, lte: weekEnd }, statut: { not: 'ANNULE' } }, include: { ballon, pilote, _count: { select: { passagers: true } } } })`
- Maps results to `VolSummary[]`
- Renders `<WeekGrid>` with navigation

- [ ] **Step 3: Commit**

```bash
git add components/week-grid.tsx "app/[locale]/(app)/vols/page.tsx"
git commit -m "feat(ui): planning semaine — week grid with vol cards"
```

---

### Task 8: Vol creation page

**Files:**

- Create: `app/[locale]/(app)/vols/create/page.tsx`

- [ ] **Step 1: Create vol creation form**

Server component that:

- Reads `?date=` and `?creneau=` from searchParams (pre-filled from planning grid click)
- Queries active ballons and pilotes for select dropdowns: `db.ballon.findMany({ where: { actif: true } })`, `db.pilote.findMany({ where: { actif: true } })`
- Renders a form with: date (date input), creneau (MATIN/SOIR select), ballon (select with nom + immat), pilote (select with prenom nom), equipier (text), vehicule (text), lieuDecollage (text), configGaz (text, pre-filled on ballon select via client JS), qteGaz (number)
- Form action calls `createVol` server action
- Needs a client component wrapper for the ballon-select → configGaz auto-fill behavior

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(app)/vols/create/"
git commit -m "feat(ui): vol creation page with ballon/pilote selects"
```

---

### Task 9: Vol detail page

**Files:**

- Create: `app/[locale]/(app)/vols/[id]/page.tsx`

- [ ] **Step 1: Create vol detail page**

Server component following `ballons/[id]/page.tsx` pattern:

- Fetch vol with ballon, pilote, passagers (decrypted poids), exploitant
- Cards: Vol info (date, creneau, statut, ballon, pilote, equipier, vehicule), Passagers table (nom, age, poids, PMR, billet reference), Devis de masse summary
- Actions: "Organiser" button (link to organiser page), "Annuler" button (calls cancelVol with confirm), "Confirmer" button (if PLANIFIE)
- Devis section: compute with `calculerDevisMasse()` using current passagers + OAT input (default 20C, editable)

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(app)/vols/[id]/page.tsx"
git commit -m "feat(ui): vol detail page with devis de masse + actions"
```

---

### Task 10: Organisation vol page

**Files:**

- Create: `app/[locale]/(app)/vols/[id]/organiser/page.tsx`
- Create: `components/devis-masse-live.tsx`

- [ ] **Step 1: Create devis de masse live component**

Create `components/devis-masse-live.tsx` — client component that displays the devis and updates when passagers change. Props: `devisResult: DevisMasseResult`. Shows a summary table and a conforme/surcharge indicator with color.

- [ ] **Step 2: Create organisation page**

Server component with two-column layout:

**Left column — billets disponibles:**

- Query billets with `statut = EN_ATTENTE` whose date window includes the vol date
- Filter: `dateVolDeb <= vol.date AND (dateVolFin >= vol.date OR dateVolFin IS NULL)`
- Also filter by creneau compatibility (billet typePlannif matches or is TOUTE_LA_JOURNEE/AU_PLUS_VITE/INDETERMINE)
- Each billet shows: reference, payeur, nb passagers, total poids
- "Affecter" button per billet → calls `affecterBillet` server action

**Right column — vol info:**

- Vol date, creneau, ballon, pilote
- Passagers already assigned (table with nom, poids, billet ref)
- "Retirer" button per passager → calls `desaffecterPassager`
- Devis de masse live (computed from current passagers)
- Capacity bar: passagers.length / ballon.nbPassagerMax
- "Confirmer le vol" button → calls `confirmerVol`

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(app)/vols/[id]/organiser/" components/devis-masse-live.tsx
git commit -m "feat(ui): vol organisation page — assign billets + live devis"
```

---

### Task 11: Tenant isolation integration tests

**Files:**

- Create: `tests/integration/vol-tenant.spec.ts`

- [ ] **Step 1: Write integration tests**

Create `tests/integration/vol-tenant.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { basePrisma } from '@/lib/db/base'
import { resetDb, seedTenant, asUser } from './helpers'

async function seedBallon(exploitantId: string) {
  return basePrisma.ballon.create({
    data: {
      exploitantId,
      nom: 'Test Ballon',
      immatriculation: `F-${exploitantId.slice(0, 4)}`,
      volumeM3: 3000,
      nbPassagerMax: 4,
      peseeAVide: 376,
      configGaz: '4xCB2990',
      manexAnnexRef: 'Test',
      performanceChart: { '20': 365 },
    },
  })
}

async function seedPilote(exploitantId: string) {
  return basePrisma.pilote.create({
    data: {
      exploitantId,
      prenom: 'Test',
      nom: 'Pilote',
      licenceBfcl: `BFCL-${exploitantId.slice(0, 4)}`,
      dateExpirationLicence: new Date('2027-01-01'),
      qualificationCommerciale: true,
      classeA: true,
      groupeA1: true,
    },
  })
}

async function seedVol(exploitantId: string, ballonId: string, piloteId: string) {
  return basePrisma.vol.create({
    data: {
      exploitantId,
      date: new Date('2026-06-15'),
      creneau: 'MATIN',
      ballonId,
      piloteId,
    },
  })
}

describe('vol tenant isolation', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('findMany returns only current tenant vols', async () => {
    const A = await seedTenant('A')
    const B = await seedTenant('B')

    const ballonA = await seedBallon(A.exploitantId)
    const piloteA = await seedPilote(A.exploitantId)
    const ballonB = await seedBallon(B.exploitantId)
    const piloteB = await seedPilote(B.exploitantId)

    await seedVol(A.exploitantId, ballonA.id, piloteA.id)
    await seedVol(B.exploitantId, ballonB.id, piloteB.id)

    const vols = await asUser(A, 'GERANT', async () => db.vol.findMany())
    expect(vols).toHaveLength(1)
    expect(vols[0]?.ballonId).toBe(ballonA.id)
  })
})
```

- [ ] **Step 2: Run integration tests**

```bash
npx vitest run tests/integration/vol-tenant.spec.ts --config vitest.integration.config.ts --reporter=verbose
```

- [ ] **Step 3: Commit**

```bash
git add tests/integration/vol-tenant.spec.ts
git commit -m "test(integration): tenant isolation for vol"
```

---

### Task 12: Verify and fix

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run --reporter=verbose
npx vitest run tests/integration/ --config vitest.integration.config.ts --reporter=verbose
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Fix any issues**

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "fix: resolve p2b type and lint issues"
git push origin main
```

---

## P2b Checkpoint

Before starting P2c, verify:

- [ ] Vol creation works with ballon/pilote validation (rejects expired CAMO, expired licence, wrong group)
- [ ] Planning semaine displays vols in correct cells
- [ ] "+" on empty cell pre-fills date and creneau
- [ ] Organisation page: can assign billets, see live devis, confirm vol
- [ ] Devis de masse: test vectors pass for Cameron Balloons ballons
- [ ] Cancel vol: unassigns passagers, resets billet statuts
- [ ] All integration tests pass (tenant isolation)
- [ ] All unit tests pass (vol validation, devis de masse)
- [ ] `npx tsc --noEmit` passes
- [ ] Deploy to preview and verify on Vercel
