# P2a — Billets, Passagers, Paiements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the billet (ticket) lifecycle with weather-deferred scheduling, multiple passengers per billet, partial payments with 6 modes, reminder email cron, and RGPD rights interface.

**Architecture:** New Prisma models (Billet, Passager, Paiement, BilletSequence) + server actions following existing pattern (zod validation, requireAuth, tenant-isolated). CRUD pages follow the established ballons/pilotes layout. Passager weights encrypted with lib/crypto (same as Pilote). Cron rappels follow the P1 digest pattern via Vercel Cron + Resend.

**Tech Stack:** Prisma, Zod, Next.js server actions, React server components, shadcn/ui, next-intl, Resend, lib/crypto AES-256-GCM.

**Spec:** `docs/superpowers/specs/2026-04-11-p2-flight-lifecycle-design.md` sections 3.1–3.4, 4.1–4.8.

---

## File Map

| File                                            | Responsibility                                                         |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| `prisma/schema.prisma`                          | Add Billet, Passager, Paiement, BilletSequence models + enums          |
| `lib/db/tenant-extension.ts`                    | Add Billet, Passager, Paiement to TENANT_FILTER                        |
| `tests/integration/helpers.ts`                  | Update resetDb with new tables                                         |
| `lib/billet/reference.ts`                       | Reference generation (prefix-year-seq) + Luhn checksum                 |
| `lib/billet/paiement.ts`                        | computeStatutPaiement pure function                                    |
| `lib/schemas/billet.ts`                         | Zod schema for billet creation/edit                                    |
| `lib/schemas/passager.ts`                       | Zod schema for passager (new file — current one is for Pilote-related) |
| `lib/schemas/paiement.ts`                       | Zod schema for paiement creation                                       |
| `lib/actions/billet.ts`                         | Server actions: createBillet, updateBillet                             |
| `lib/actions/paiement.ts`                       | Server actions: addPaiement, deletePaiement                            |
| `lib/email/rappels.ts`                          | Build and send rappel email                                            |
| `app/api/cron/rappels/route.ts`                 | Vercel Cron endpoint for daily reminders                               |
| `app/[locale]/(app)/billets/page.tsx`           | Billet list page                                                       |
| `app/[locale]/(app)/billets/[id]/page.tsx`      | Billet detail page                                                     |
| `app/[locale]/(app)/billets/[id]/edit/page.tsx` | Billet create/edit page                                                |
| `app/[locale]/(app)/billets/new/page.tsx`       | Redirect to edit with new=true                                         |
| `app/[locale]/(app)/rgpd/page.tsx`              | RGPD rights interface                                                  |
| `lib/actions/rgpd.ts`                           | Server actions: searchPassager, anonymisePassager, exportPassager      |
| `components/app-sidebar.tsx`                    | Add Billets + RGPD nav items                                           |
| `components/paiement-form.tsx`                  | Reusable paiement add form                                             |
| `components/passager-table-editor.tsx`          | Inline editable passager rows                                          |
| `messages/fr.json`                              | French translations for billets/paiements/RGPD                         |
| `messages/en.json`                              | English translations                                                   |
| `tests/unit/billet-reference.spec.ts`           | Unit tests for reference generation + checksum                         |
| `tests/unit/paiement-statut.spec.ts`            | Unit tests for statut computation                                      |
| `tests/integration/billet-tenant.spec.ts`       | Tenant isolation for Billet, Passager, Paiement                        |

---

### Task 1: Prisma schema migration

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enums to schema.prisma**

Add after the existing `AuditAction` enum:

```prisma
enum TypePlannif {
  MATIN
  SOIR
  TOUTE_LA_JOURNEE
  AU_PLUS_VITE
  AUTRE
  INDETERMINE
}

enum StatutBillet {
  EN_ATTENTE
  PLANIFIE
  VOLE
  ANNULE
  REMBOURSE
  EXPIRE
}

enum StatutPaiement {
  EN_ATTENTE
  PARTIEL
  SOLDE
  REMBOURSE
}

enum ModePaiement {
  ESPECES
  CHEQUE
  CB
  VIREMENT
  CHEQUE_VACANCES
  AVOIR
}
```

- [ ] **Step 2: Add BilletSequence model**

```prisma
model BilletSequence {
  exploitantId String
  year         Int
  lastSeq      Int    @default(0)

  @@id([exploitantId, year])
  @@map("billet_sequence")
}
```

- [ ] **Step 3: Add Billet model**

```prisma
model Billet {
  id              String         @id @default(cuid())
  exploitantId    String
  exploitant      Exploitant     @relation(fields: [exploitantId], references: [id], onDelete: Cascade)

  reference       String
  checksum        String

  typePlannif     TypePlannif    @default(INDETERMINE)
  dateVolDeb      DateTime?
  dateVolFin      DateTime?
  dateValidite    DateTime?

  payeurCiv       String?
  payeurPrenom    String
  payeurNom       String
  payeurEmail     String?
  payeurTelephone String?
  payeurAdresse   String?
  payeurCp        String?
  payeurVille     String?

  statut          StatutBillet   @default(EN_ATTENTE)
  statutPaiement  StatutPaiement @default(EN_ATTENTE)
  montantTtc      Int
  enAttente       Boolean        @default(false)

  categorie       String?
  provenance      String?
  lieuDecollage   String?
  survol          String?
  commentaire     String?
  dateRappel      DateTime?

  passagers       Passager[]
  paiements       Paiement[]

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@unique([exploitantId, reference])
  @@index([exploitantId])
  @@index([exploitantId, statut])
  @@index([exploitantId, dateRappel])
  @@map("billet")
}
```

- [ ] **Step 4: Add Passager model**

```prisma
model Passager {
  id              String     @id @default(cuid())
  exploitantId    String
  exploitant      Exploitant @relation(fields: [exploitantId], references: [id], onDelete: Cascade)
  billetId        String
  billet          Billet     @relation(fields: [billetId], references: [id], onDelete: Cascade)

  prenom          String
  nom             String
  email           String?
  telephone       String?
  age             Int?
  poidsEncrypted  String?
  pmr             Boolean    @default(false)

  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  @@index([exploitantId])
  @@index([billetId])
  @@map("passager")
}
```

Note: `volId` FK is NOT added yet — that comes in P2b when the Vol model exists.

- [ ] **Step 5: Add Paiement model**

```prisma
model Paiement {
  id               String       @id @default(cuid())
  exploitantId     String
  exploitant       Exploitant   @relation(fields: [exploitantId], references: [id], onDelete: Cascade)
  billetId         String
  billet           Billet       @relation(fields: [billetId], references: [id], onDelete: Cascade)

  modePaiement     ModePaiement
  montantTtc       Int
  datePaiement     DateTime
  dateEncaissement DateTime?
  commentaire      String?

  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  @@index([exploitantId])
  @@index([billetId])
  @@map("paiement")
}
```

- [ ] **Step 6: Add relations to Exploitant**

Add to the Exploitant model:

```prisma
  billets     Billet[]
  passagers   Passager[]
  paiements   Paiement[]
```

- [ ] **Step 7: Run migration**

```bash
npx prisma migrate dev --name p2a-billet-passager-paiement
npx prisma generate
```

Expected: Migration created, client generated, no errors.

- [ ] **Step 8: Commit**

```bash
git add prisma/
git commit -m "feat(prisma): p2a schema — billet, passager, paiement models + enums"
```

---

### Task 2: Tenant isolation + test helpers

**Files:**

- Modify: `lib/db/tenant-extension.ts`
- Modify: `tests/integration/helpers.ts`

- [ ] **Step 1: Add new models to TENANT_FILTER**

In `lib/db/tenant-extension.ts`, add to the `TENANT_FILTER` object:

```ts
  Billet: 'exploitantId',
  Passager: 'exploitantId',
  Paiement: 'exploitantId',
```

And add `BilletSequence` to `UNTENANTED` (accessed only via raw SQL in `nextSequence()`):

```ts
export const UNTENANTED = new Set<string>([
  'Account',
  'Session',
  'VerificationToken',
  'BilletSequence',
])
```

- [ ] **Step 2: Update resetDb in helpers.ts**

In `tests/integration/helpers.ts`, add delete calls BEFORE the existing ones (respect FK order):

```ts
export async function resetDb() {
  await basePrisma.paiement.deleteMany({})
  await basePrisma.passager.deleteMany({})
  await basePrisma.billet.deleteMany({})
  await basePrisma.billetSequence.deleteMany({})
  await basePrisma.auditLog.deleteMany({})
  await basePrisma.session.deleteMany({})
  await basePrisma.account.deleteMany({})
  await basePrisma.verificationToken.deleteMany({})
  await basePrisma.pilote.deleteMany({})
  await basePrisma.ballon.deleteMany({})
  await basePrisma.user.deleteMany({})
  await basePrisma.exploitant.deleteMany({})
}
```

- [ ] **Step 3: Verify existing tests still pass**

```bash
npx vitest run tests/integration/ --reporter=verbose
```

Expected: All existing integration tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/db/tenant-extension.ts tests/integration/helpers.ts
git commit -m "feat(db): extend tenant isolation for billet, passager, paiement"
```

---

### Task 3: Billet reference generation + checksum

**Files:**

- Create: `lib/billet/reference.ts`
- Create: `tests/unit/billet-reference.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/billet-reference.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatReference, computeLuhnChecksum, verifyReference } from '@/lib/billet/reference'

describe('formatReference', () => {
  it('formats with prefix, year, and zero-padded sequence', () => {
    expect(formatReference('CBF', 2026, 42)).toBe('CBF-2026-0042')
  })

  it('formats single-digit sequence', () => {
    expect(formatReference('CBF', 2026, 1)).toBe('CBF-2026-0001')
  })

  it('formats 5-digit sequence without truncation', () => {
    expect(formatReference('CBF', 2026, 12345)).toBe('CBF-2026-12345')
  })
})

describe('computeLuhnChecksum', () => {
  it('returns a single digit string', () => {
    const cs = computeLuhnChecksum('CBF-2026-0042')
    expect(cs).toMatch(/^\d$/)
  })

  it('is deterministic', () => {
    const a = computeLuhnChecksum('CBF-2026-0042')
    const b = computeLuhnChecksum('CBF-2026-0042')
    expect(a).toBe(b)
  })

  it('differs for different references', () => {
    const a = computeLuhnChecksum('CBF-2026-0042')
    const b = computeLuhnChecksum('CBF-2026-0043')
    expect(a).not.toBe(b)
  })
})

describe('verifyReference', () => {
  it('returns true for a valid reference+checksum pair', () => {
    const ref = 'CBF-2026-0042'
    const cs = computeLuhnChecksum(ref)
    expect(verifyReference(ref, cs)).toBe(true)
  })

  it('returns false for a wrong checksum', () => {
    expect(verifyReference('CBF-2026-0042', '0')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/billet-reference.spec.ts --reporter=verbose
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement reference generation**

Create `lib/billet/reference.ts`:

```ts
/**
 * Format a billet reference: PREFIX-YYYY-NNNN
 */
export function formatReference(prefix: string, year: number, seq: number): string {
  const padded = String(seq).padStart(4, '0')
  return `${prefix}-${year}-${padded}`
}

/**
 * Luhn mod-10 checksum on the numeric characters of a reference string.
 * Used for telephone verification of billet references.
 */
export function computeLuhnChecksum(reference: string): string {
  const digits = reference.replace(/\D/g, '').split('').map(Number)
  let sum = 0
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i]
    if ((digits.length - i) % 2 === 0) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return String((10 - (sum % 10)) % 10)
}

/**
 * Verify a reference against its checksum.
 */
export function verifyReference(reference: string, checksum: string): boolean {
  return computeLuhnChecksum(reference) === checksum
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/billet-reference.spec.ts --reporter=verbose
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/billet/reference.ts tests/unit/billet-reference.spec.ts
git commit -m "feat(billet): reference generation with Luhn checksum + tdd"
```

---

### Task 4: Paiement statut computation

**Files:**

- Create: `lib/billet/paiement.ts`
- Create: `tests/unit/paiement-statut.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/paiement-statut.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeStatutPaiement } from '@/lib/billet/paiement'

describe('computeStatutPaiement', () => {
  it('returns EN_ATTENTE when no payments exist', () => {
    expect(computeStatutPaiement(15000, [])).toBe('EN_ATTENTE')
  })

  it('returns PARTIEL when total paid < montantTtc', () => {
    expect(computeStatutPaiement(15000, [5000])).toBe('PARTIEL')
  })

  it('returns SOLDE when total paid == montantTtc', () => {
    expect(computeStatutPaiement(15000, [10000, 5000])).toBe('SOLDE')
  })

  it('returns SOLDE when total paid > montantTtc (overpayment)', () => {
    expect(computeStatutPaiement(15000, [10000, 6000])).toBe('SOLDE')
  })

  it('handles refunds (negative amounts)', () => {
    expect(computeStatutPaiement(15000, [15000, -5000])).toBe('PARTIEL')
  })

  it('returns EN_ATTENTE when refunds cancel all payments', () => {
    expect(computeStatutPaiement(15000, [15000, -15000])).toBe('EN_ATTENTE')
  })

  it('returns REMBOURSE when net amount is negative', () => {
    expect(computeStatutPaiement(15000, [15000, -20000])).toBe('REMBOURSE')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/paiement-statut.spec.ts --reporter=verbose
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement statut computation**

Create `lib/billet/paiement.ts`:

```ts
type StatutPaiement = 'EN_ATTENTE' | 'PARTIEL' | 'SOLDE' | 'REMBOURSE'

/**
 * Compute the payment status for a billet based on its total amount and payment amounts.
 * All amounts are in centimes.
 *
 * @param montantTtc - Total billet amount in centimes
 * @param paiementMontants - Array of payment amounts (negative = refund)
 */
export function computeStatutPaiement(
  montantTtc: number,
  paiementMontants: readonly number[],
): StatutPaiement {
  const totalPaye = paiementMontants.reduce((sum, m) => sum + m, 0)

  if (totalPaye < 0) return 'REMBOURSE'
  if (totalPaye === 0) return 'EN_ATTENTE'
  if (totalPaye >= montantTtc) return 'SOLDE'
  return 'PARTIEL'
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/paiement-statut.spec.ts --reporter=verbose
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/billet/paiement.ts tests/unit/paiement-statut.spec.ts
git commit -m "feat(billet): paiement statut computation with tdd"
```

---

### Task 5: Zod schemas

**Files:**

- Create: `lib/schemas/billet.ts` (replace — current file doesn't exist for billet)
- Create: `lib/schemas/passager.ts` (new file — not the existing pilote one)
- Create: `lib/schemas/paiement.ts`

- [ ] **Step 1: Create passager schema**

Create `lib/schemas/passager.ts`:

```ts
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
```

- [ ] **Step 2: Create paiement schema**

Create `lib/schemas/paiement.ts`:

```ts
import { z } from 'zod'

export const paiementCreateSchema = z.object({
  modePaiement: z.enum(['ESPECES', 'CHEQUE', 'CB', 'VIREMENT', 'CHEQUE_VACANCES', 'AVOIR']),
  montantTtc: z.coerce.number().int('Montant invalide'),
  datePaiement: z.coerce.date(),
  dateEncaissement: z.coerce.date().optional(),
  commentaire: z.string().optional().or(z.literal('')),
})

export type PaiementFormData = z.infer<typeof paiementCreateSchema>
```

- [ ] **Step 3: Create billet schema**

Create `lib/schemas/billet.ts`:

```ts
import { z } from 'zod'
import { passagerSchema } from './passager'

export const billetCreateSchema = z.object({
  typePlannif: z.enum([
    'MATIN',
    'SOIR',
    'TOUTE_LA_JOURNEE',
    'AU_PLUS_VITE',
    'AUTRE',
    'INDETERMINE',
  ]),
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

  montantTtc: z.coerce.number().int().nonnegative('Montant invalide'),
  categorie: z.string().optional().or(z.literal('')),
  provenance: z.string().optional().or(z.literal('')),
  lieuDecollage: z.string().optional().or(z.literal('')),
  survol: z.string().optional().or(z.literal('')),
  commentaire: z.string().optional().or(z.literal('')),
  dateRappel: z.coerce.date().optional(),

  passagers: z.array(passagerSchema).min(1, 'Au moins un passager requis'),
})

export type BilletFormData = z.infer<typeof billetCreateSchema>
```

- [ ] **Step 4: Commit**

```bash
git add lib/schemas/billet.ts lib/schemas/passager.ts lib/schemas/paiement.ts
git commit -m "feat(schemas): zod validation for billet, passager, paiement"
```

---

### Task 6: Server actions — billet CRUD

**Files:**

- Create: `lib/actions/billet.ts`

- [ ] **Step 1: Implement createBillet action**

Create `lib/actions/billet.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { basePrisma } from '@/lib/db/base'
import { billetCreateSchema } from '@/lib/schemas/billet'
import { encrypt } from '@/lib/crypto'
import { formatReference, computeLuhnChecksum } from '@/lib/billet/reference'
import { computeStatutPaiement } from '@/lib/billet/paiement'

async function nextSequence(exploitantId: string, year: number): Promise<number> {
  const row = await basePrisma.$queryRaw<{ lastSeq: number }[]>`
    INSERT INTO billet_sequence ("exploitantId", year, "lastSeq")
    VALUES (${exploitantId}, ${year}, 1)
    ON CONFLICT ("exploitantId", year)
    DO UPDATE SET "lastSeq" = billet_sequence."lastSeq" + 1
    RETURNING "lastSeq"
  `
  return row[0].lastSeq
}

function extractBilletData(formData: FormData) {
  const passagersJson = formData.get('passagers')
  let passagers: unknown[] = []
  if (typeof passagersJson === 'string') {
    try {
      passagers = JSON.parse(passagersJson)
    } catch {
      passagers = []
    }
  }

  return {
    typePlannif: formData.get('typePlannif'),
    dateVolDeb: formData.get('dateVolDeb') || undefined,
    dateVolFin: formData.get('dateVolFin') || undefined,
    dateValidite: formData.get('dateValidite') || undefined,
    payeurCiv: formData.get('payeurCiv') || undefined,
    payeurPrenom: formData.get('payeurPrenom'),
    payeurNom: formData.get('payeurNom'),
    payeurEmail: formData.get('payeurEmail') || undefined,
    payeurTelephone: formData.get('payeurTelephone') || undefined,
    payeurAdresse: formData.get('payeurAdresse') || undefined,
    payeurCp: formData.get('payeurCp') || undefined,
    payeurVille: formData.get('payeurVille') || undefined,
    montantTtc: formData.get('montantTtc'),
    categorie: formData.get('categorie') || undefined,
    provenance: formData.get('provenance') || undefined,
    lieuDecollage: formData.get('lieuDecollage') || undefined,
    survol: formData.get('survol') || undefined,
    commentaire: formData.get('commentaire') || undefined,
    dateRappel: formData.get('dateRappel') || undefined,
    passagers,
  }
}

export async function createBillet(
  locale: string,
  formData: FormData,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const ctx = getContext()

    const raw = extractBilletData(formData)
    const result = billetCreateSchema.safeParse(raw)
    if (!result.success) {
      const firstError = result.error.issues[0]
      return { error: firstError?.message ?? 'Donnees invalides' }
    }

    const { passagers, ...billetData } = result.data
    const year = new Date().getFullYear()
    const prefix = 'CBF' // TODO P-SaaS: make configurable per exploitant
    const seq = await nextSequence(ctx.exploitantId, year)
    const reference = formatReference(prefix, year, seq)
    const checksum = computeLuhnChecksum(reference)

    const billet = await db.billet.create({
      data: {
        ...billetData,
        exploitantId: ctx.exploitantId,
        reference,
        checksum,
        passagers: {
          create: passagers.map((p) => ({
            exploitantId: ctx.exploitantId,
            prenom: p.prenom,
            nom: p.nom,
            email: p.email || null,
            telephone: p.telephone || null,
            age: p.age ?? null,
            poidsEncrypted: p.poids != null ? encrypt(p.poids.toString()) : null,
            pmr: p.pmr,
          })),
        },
      },
    })

    redirect(`/${locale}/billets/${billet.id}`)
  })
}

export async function updateBillet(
  id: string,
  locale: string,
  formData: FormData,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const ctx = getContext()

    const raw = extractBilletData(formData)
    const result = billetCreateSchema.safeParse(raw)
    if (!result.success) {
      const firstError = result.error.issues[0]
      return { error: firstError?.message ?? 'Donnees invalides' }
    }

    const { passagers, ...billetData } = result.data

    // Delete existing passagers and recreate (simpler than diffing)
    await db.passager.deleteMany({ where: { billetId: id } })

    await db.billet.update({
      where: { id },
      data: {
        ...billetData,
        passagers: {
          create: passagers.map((p) => ({
            exploitantId: ctx.exploitantId,
            prenom: p.prenom,
            nom: p.nom,
            email: p.email || null,
            telephone: p.telephone || null,
            age: p.age ?? null,
            poidsEncrypted: p.poids != null ? encrypt(p.poids.toString()) : null,
            pmr: p.pmr,
          })),
        },
      },
    })

    redirect(`/${locale}/billets/${id}`)
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/actions/billet.ts
git commit -m "feat(actions): billet create + update server actions"
```

---

### Task 7: Server actions — paiement CRUD

**Files:**

- Create: `lib/actions/paiement.ts`

- [ ] **Step 1: Implement addPaiement and deletePaiement**

Create `lib/actions/paiement.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { paiementCreateSchema } from '@/lib/schemas/paiement'
import { computeStatutPaiement } from '@/lib/billet/paiement'

async function recalcStatutPaiement(billetId: string): Promise<void> {
  const billet = await db.billet.findUniqueOrThrow({ where: { id: billetId } })
  const paiements = await db.paiement.findMany({
    where: { billetId },
    select: { montantTtc: true },
  })
  const statut = computeStatutPaiement(
    billet.montantTtc,
    paiements.map((p) => p.montantTtc),
  )
  await db.billet.update({
    where: { id: billetId },
    data: { statutPaiement: statut },
  })
}

export async function addPaiement(
  billetId: string,
  locale: string,
  formData: FormData,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const ctx = getContext()

    const raw = {
      modePaiement: formData.get('modePaiement'),
      montantTtc: formData.get('montantTtc'),
      datePaiement: formData.get('datePaiement'),
      dateEncaissement: formData.get('dateEncaissement') || undefined,
      commentaire: formData.get('commentaire') || undefined,
    }

    const result = paiementCreateSchema.safeParse(raw)
    if (!result.success) {
      const firstError = result.error.issues[0]
      return { error: firstError?.message ?? 'Donnees invalides' }
    }

    await db.paiement.create({
      data: {
        ...result.data,
        billetId,
        exploitantId: ctx.exploitantId,
      },
    })

    await recalcStatutPaiement(billetId)

    revalidatePath(`/${locale}/billets/${billetId}`)
    return {}
  })
}

export async function deletePaiement(
  paiementId: string,
  billetId: string,
  locale: string,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    await db.paiement.delete({ where: { id: paiementId } })
    await recalcStatutPaiement(billetId)

    revalidatePath(`/${locale}/billets/${billetId}`)
    return {}
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/actions/paiement.ts
git commit -m "feat(actions): paiement add/delete with auto statut recalc"
```

---

### Task 8: i18n messages

**Files:**

- Modify: `messages/fr.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add French translations**

Add to `messages/fr.json` at the root level:

```json
"billets": {
  "title": "Billets de vol",
  "new": "Nouveau billet",
  "backToList": "Retour a la liste",
  "edit": "Modifier",
  "save": "Enregistrer",
  "saveSuccess": "Billet enregistre",
  "detail": "Detail du billet",
  "noPassengers": "Aucun passager",
  "addPassenger": "Ajouter un passager",
  "removePassenger": "Retirer",
  "payeurIsPassenger": "Le payeur est aussi passager",
  "fields": {
    "reference": "Reference",
    "checksum": "Code verification",
    "typePlannif": "Type de planification",
    "dateVolDeb": "Date debut fenetre",
    "dateVolFin": "Date fin fenetre",
    "dateValidite": "Date validite",
    "payeurPrenom": "Prenom payeur",
    "payeurNom": "Nom payeur",
    "payeurEmail": "Email payeur",
    "payeurTelephone": "Telephone payeur",
    "payeurAdresse": "Adresse",
    "payeurCp": "Code postal",
    "payeurVille": "Ville",
    "payeurCiv": "Civilite",
    "montantTtc": "Montant TTC (EUR)",
    "categorie": "Categorie",
    "provenance": "Provenance",
    "lieuDecollage": "Lieu de decollage souhaite",
    "survol": "Zone de survol souhaitee",
    "commentaire": "Commentaire",
    "dateRappel": "Date de rappel",
    "statut": "Statut",
    "statutPaiement": "Statut paiement",
    "enAttente": "En attente"
  },
  "typePlannif": {
    "MATIN": "Matin",
    "SOIR": "Soir",
    "TOUTE_LA_JOURNEE": "Toute la journee",
    "AU_PLUS_VITE": "Au plus vite",
    "AUTRE": "Autre",
    "INDETERMINE": "Indetermine"
  },
  "statut": {
    "EN_ATTENTE": "En attente",
    "PLANIFIE": "Planifie",
    "VOLE": "Vole",
    "ANNULE": "Annule",
    "REMBOURSE": "Rembourse",
    "EXPIRE": "Expire"
  },
  "statutPaiement": {
    "EN_ATTENTE": "En attente",
    "PARTIEL": "Partiel",
    "SOLDE": "Solde",
    "REMBOURSE": "Rembourse"
  }
},
"passagers": {
  "fields": {
    "prenom": "Prenom",
    "nom": "Nom",
    "email": "Email",
    "telephone": "Telephone",
    "age": "Age",
    "poids": "Poids (kg)",
    "pmr": "PMR"
  }
},
"paiements": {
  "title": "Paiements",
  "add": "Ajouter un paiement",
  "delete": "Supprimer",
  "confirmDelete": "Supprimer ce paiement ?",
  "solde": "Solde restant",
  "fields": {
    "modePaiement": "Mode de paiement",
    "montantTtc": "Montant (EUR)",
    "datePaiement": "Date paiement",
    "dateEncaissement": "Date encaissement",
    "commentaire": "Commentaire"
  },
  "modes": {
    "ESPECES": "Especes",
    "CHEQUE": "Cheque",
    "CB": "Carte bancaire",
    "VIREMENT": "Virement",
    "CHEQUE_VACANCES": "Cheque-vacances",
    "AVOIR": "Avoir"
  }
},
"rgpd": {
  "title": "RGPD — Droits des passagers",
  "search": "Rechercher un passager",
  "searchPlaceholder": "Nom, email ou telephone",
  "noResults": "Aucun passager trouve",
  "actions": {
    "view": "Consulter",
    "export": "Exporter (JSON)",
    "anonymise": "Anonymiser",
    "confirmAnonymise": "Cette action est irreversible. Les donnees personnelles seront supprimees. Confirmer ?"
  },
  "anonymised": "Donnees anonymisees"
}
```

- [ ] **Step 2: Add English translations**

Add equivalent keys to `messages/en.json` with English values. Key mapping:

```json
"billets": {
  "title": "Flight tickets",
  "new": "New ticket",
  "backToList": "Back to list",
  "edit": "Edit",
  "save": "Save",
  "saveSuccess": "Ticket saved",
  "detail": "Ticket detail",
  "noPassengers": "No passengers",
  "addPassenger": "Add passenger",
  "removePassenger": "Remove",
  "payeurIsPassenger": "Payer is also a passenger",
  "fields": {
    "reference": "Reference",
    "checksum": "Verification code",
    "typePlannif": "Scheduling type",
    "dateVolDeb": "Window start date",
    "dateVolFin": "Window end date",
    "dateValidite": "Validity date",
    "payeurPrenom": "Payer first name",
    "payeurNom": "Payer last name",
    "payeurEmail": "Payer email",
    "payeurTelephone": "Payer phone",
    "payeurAdresse": "Address",
    "payeurCp": "Postal code",
    "payeurVille": "City",
    "payeurCiv": "Title",
    "montantTtc": "Amount incl. tax (EUR)",
    "categorie": "Category",
    "provenance": "Source",
    "lieuDecollage": "Desired takeoff location",
    "survol": "Desired flyover zone",
    "commentaire": "Comment",
    "dateRappel": "Reminder date",
    "statut": "Status",
    "statutPaiement": "Payment status",
    "enAttente": "On hold"
  },
  "typePlannif": {
    "MATIN": "Morning",
    "SOIR": "Evening",
    "TOUTE_LA_JOURNEE": "All day",
    "AU_PLUS_VITE": "ASAP",
    "AUTRE": "Other",
    "INDETERMINE": "Undetermined"
  },
  "statut": {
    "EN_ATTENTE": "Pending",
    "PLANIFIE": "Scheduled",
    "VOLE": "Flown",
    "ANNULE": "Cancelled",
    "REMBOURSE": "Refunded",
    "EXPIRE": "Expired"
  },
  "statutPaiement": {
    "EN_ATTENTE": "Pending",
    "PARTIEL": "Partial",
    "SOLDE": "Paid",
    "REMBOURSE": "Refunded"
  }
},
"passagers": {
  "fields": {
    "prenom": "First name",
    "nom": "Last name",
    "email": "Email",
    "telephone": "Phone",
    "age": "Age",
    "poids": "Weight (kg)",
    "pmr": "PRM"
  }
},
"paiements": {
  "title": "Payments",
  "add": "Add payment",
  "delete": "Delete",
  "confirmDelete": "Delete this payment?",
  "solde": "Remaining balance",
  "fields": {
    "modePaiement": "Payment method",
    "montantTtc": "Amount (EUR)",
    "datePaiement": "Payment date",
    "dateEncaissement": "Settlement date",
    "commentaire": "Comment"
  },
  "modes": {
    "ESPECES": "Cash",
    "CHEQUE": "Cheque",
    "CB": "Card",
    "VIREMENT": "Wire transfer",
    "CHEQUE_VACANCES": "Holiday voucher",
    "AVOIR": "Credit"
  }
},
"rgpd": {
  "title": "GDPR — Passenger rights",
  "search": "Search passenger",
  "searchPlaceholder": "Name, email or phone",
  "noResults": "No passenger found",
  "actions": {
    "view": "View",
    "export": "Export (JSON)",
    "anonymise": "Anonymise",
    "confirmAnonymise": "This action is irreversible. Personal data will be deleted. Confirm?"
  },
  "anonymised": "Data anonymised"
}
```

- [ ] **Step 3: Add sidebar nav keys**

Add to `nav` section in both `fr.json` and `en.json`:

```json
// fr.json nav
"billets": "Billets",
"rgpd": "RGPD"

// en.json nav
"billets": "Tickets",
"rgpd": "GDPR"
```

- [ ] **Step 4: Commit**

```bash
git add messages/fr.json messages/en.json
git commit -m "feat(i18n): translations for billets, paiements, passagers, rgpd"
```

---

### Task 9: Sidebar update

**Files:**

- Modify: `components/app-sidebar.tsx`

- [ ] **Step 1: Add Billets and RGPD nav items**

Import `Ticket` and `Shield` from lucide-react, add to navItems array after `pilotes`:

```ts
import { Home, Wind, User2, Settings, Ticket, Shield } from 'lucide-react'

// In navItems array, after pilotes entry:
{
  key: 'billets' as const,
  href: `/${locale}/billets`,
  icon: Ticket,
},
// After settings entry:
{
  key: 'rgpd' as const,
  href: `/${locale}/rgpd`,
  icon: Shield,
},
```

Full order: home, ballons, pilotes, **billets**, settings, **rgpd**.

- [ ] **Step 2: Commit**

```bash
git add components/app-sidebar.tsx
git commit -m "feat(ui): add billets + rgpd nav items to sidebar"
```

---

### Task 10: Billet list page

**Files:**

- Create: `app/[locale]/(app)/billets/page.tsx`

- [ ] **Step 1: Implement billet list page**

Create `app/[locale]/(app)/billets/page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

type Props = {
  params: Promise<{ locale: string }>
}

const STATUT_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  EN_ATTENTE: 'outline',
  PLANIFIE: 'default',
  VOLE: 'secondary',
  ANNULE: 'destructive',
  REMBOURSE: 'destructive',
  EXPIRE: 'secondary',
}

const PAIEMENT_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  EN_ATTENTE: 'outline',
  PARTIEL: 'secondary',
  SOLDE: 'default',
  REMBOURSE: 'destructive',
}

function formatCentimes(centimes: number): string {
  return (centimes / 100).toFixed(2) + ' EUR'
}

export default async function BilletsListPage({ params }: Props) {
  const { locale } = await params
  return requireAuth(async () => {
    const t = await getTranslations('billets')

    const billets = await db.billet.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { passagers: true } } },
    })

    return (
      <main className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <Link href={`/${locale}/billets/new`} className={cn(buttonVariants({ size: 'sm' }))}>
            {t('new')}
          </Link>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('fields.reference')}</TableHead>
              <TableHead>{t('fields.payeurNom')}</TableHead>
              <TableHead>Passagers</TableHead>
              <TableHead>{t('fields.montantTtc')}</TableHead>
              <TableHead>{t('fields.statut')}</TableHead>
              <TableHead>{t('fields.statutPaiement')}</TableHead>
              <TableHead>{t('fields.typePlannif')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {billets.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <Link href={`/${locale}/billets/${b.id}`} className="font-medium underline">
                    {b.reference}
                  </Link>
                </TableCell>
                <TableCell>
                  {b.payeurPrenom} {b.payeurNom}
                </TableCell>
                <TableCell>{b._count.passagers}</TableCell>
                <TableCell>{formatCentimes(b.montantTtc)}</TableCell>
                <TableCell>
                  <Badge variant={STATUT_VARIANT[b.statut] ?? 'outline'}>
                    {t(`statut.${b.statut}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={PAIEMENT_VARIANT[b.statutPaiement] ?? 'outline'}>
                    {t(`statutPaiement.${b.statutPaiement}`)}
                  </Badge>
                </TableCell>
                <TableCell>{t(`typePlannif.${b.typePlannif}`)}</TableCell>
              </TableRow>
            ))}
            {billets.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {t('noPassengers')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </main>
    )
  })
}
```

- [ ] **Step 2: Create redirect page for /billets/new**

Create `app/[locale]/(app)/billets/new/page.tsx`:

```tsx
import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function NewBilletPage({ params }: Props) {
  const { locale } = await params
  redirect(`/${locale}/billets/new/edit`)
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/\(app\)/billets/
git commit -m "feat(ui): billet list page with statut badges"
```

---

### Task 11: Billet create/edit page

**Files:**

- Create: `app/[locale]/(app)/billets/[id]/edit/page.tsx`
- Create: `components/passager-table-editor.tsx`

- [ ] **Step 1: Create passager table editor component**

Create `components/passager-table-editor.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type PassagerRow = {
  prenom: string
  nom: string
  email: string
  telephone: string
  age: string
  poids: string
  pmr: boolean
}

type Props = {
  passagers: readonly PassagerRow[]
  onChange: (passagers: PassagerRow[]) => void
}

const EMPTY_ROW: PassagerRow = {
  prenom: '',
  nom: '',
  email: '',
  telephone: '',
  age: '',
  poids: '',
  pmr: false,
}

export function PassagerTableEditor({ passagers, onChange }: Props) {
  const t = useTranslations('passagers')

  function addRow() {
    onChange([...passagers, { ...EMPTY_ROW }])
  }

  function removeRow(index: number) {
    onChange(passagers.filter((_, i) => i !== index))
  }

  function updateRow(index: number, field: keyof PassagerRow, value: string | boolean) {
    onChange(passagers.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('fields.prenom')}</TableHead>
            <TableHead>{t('fields.nom')}</TableHead>
            <TableHead>{t('fields.age')}</TableHead>
            <TableHead>{t('fields.poids')}</TableHead>
            <TableHead>{t('fields.pmr')}</TableHead>
            <TableHead>{t('fields.email')}</TableHead>
            <TableHead>{t('fields.telephone')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {passagers.map((row, i) => (
            <TableRow key={i}>
              <TableCell>
                <Input
                  value={row.prenom}
                  onChange={(e) => updateRow(i, 'prenom', e.target.value)}
                  required
                />
              </TableCell>
              <TableCell>
                <Input
                  value={row.nom}
                  onChange={(e) => updateRow(i, 'nom', e.target.value)}
                  required
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={row.age}
                  onChange={(e) => updateRow(i, 'age', e.target.value)}
                  className="w-16"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={row.poids}
                  onChange={(e) => updateRow(i, 'poids', e.target.value)}
                  className="w-20"
                />
              </TableCell>
              <TableCell>
                <Checkbox checked={row.pmr} onCheckedChange={(v) => updateRow(i, 'pmr', !!v)} />
              </TableCell>
              <TableCell>
                <Input
                  type="email"
                  value={row.email}
                  onChange={(e) => updateRow(i, 'email', e.target.value)}
                />
              </TableCell>
              <TableCell>
                <Input
                  value={row.telephone}
                  onChange={(e) => updateRow(i, 'telephone', e.target.value)}
                />
              </TableCell>
              <TableCell>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(i)}>
                  X
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        + Passager
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Create billet edit page**

Create `app/[locale]/(app)/billets/[id]/edit/page.tsx`:

This is a client-component form page. It loads existing billet data for edit, or renders empty for create (id = "new").

```tsx
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { BilletForm } from './billet-form'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

export default async function BilletEditPage({ params }: Props) {
  const { locale, id } = await params
  return requireAuth(async () => {
    const t = await getTranslations('billets')
    const isNew = id === 'new'

    let billet = null
    let passagers: {
      prenom: string
      nom: string
      email: string
      telephone: string
      age: string
      poids: string
      pmr: boolean
    }[] = []

    if (!isNew) {
      billet = await db.billet.findUnique({
        where: { id },
        include: { passagers: true },
      })
      if (!billet) notFound()

      passagers = billet.passagers.map((p) => ({
        prenom: p.prenom,
        nom: p.nom,
        email: p.email ?? '',
        telephone: p.telephone ?? '',
        age: p.age != null ? String(p.age) : '',
        poids: p.poidsEncrypted ? String(parseInt(decrypt(p.poidsEncrypted))) : '',
        pmr: p.pmr,
      }))
    }

    return (
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">{isNew ? t('new') : t('edit')}</h1>
        <BilletForm
          locale={locale}
          billetId={isNew ? undefined : id}
          defaultValues={billet}
          defaultPassagers={passagers}
        />
      </main>
    )
  })
}
```

- [ ] **Step 3: Create BilletForm client component**

Create `app/[locale]/(app)/billets/[id]/edit/billet-form.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PassagerTableEditor, type PassagerRow } from '@/components/passager-table-editor'
import { createBillet, updateBillet } from '@/lib/actions/billet'

const TYPE_PLANNIF_OPTIONS = [
  'MATIN',
  'SOIR',
  'TOUTE_LA_JOURNEE',
  'AU_PLUS_VITE',
  'AUTRE',
  'INDETERMINE',
] as const

type Props = {
  locale: string
  billetId?: string
  defaultValues: Record<string, unknown> | null
  defaultPassagers: PassagerRow[]
}

export function BilletForm({ locale, billetId, defaultValues, defaultPassagers }: Props) {
  const t = useTranslations('billets')
  const [passagers, setPassagers] = useState<PassagerRow[]>(
    defaultPassagers.length > 0
      ? defaultPassagers
      : [{ prenom: '', nom: '', email: '', telephone: '', age: '', poids: '', pmr: false }],
  )
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    formData.set('passagers', JSON.stringify(passagers))
    const result = billetId
      ? await updateBillet(billetId, locale, formData)
      : await createBillet(locale, formData)
    if (result?.error) setError(result.error)
  }

  const d = defaultValues as Record<string, string | number | boolean | null> | null

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payeur</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t('fields.payeurCiv')}</Label>
            <Select name="payeurCiv" defaultValue={(d?.payeurCiv as string) ?? ''}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                <SelectItem value="M.">M.</SelectItem>
                <SelectItem value="Mme">Mme</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div />
          <div>
            <Label>{t('fields.payeurPrenom')}</Label>
            <Input name="payeurPrenom" required defaultValue={(d?.payeurPrenom as string) ?? ''} />
          </div>
          <div>
            <Label>{t('fields.payeurNom')}</Label>
            <Input name="payeurNom" required defaultValue={(d?.payeurNom as string) ?? ''} />
          </div>
          <div>
            <Label>{t('fields.payeurEmail')}</Label>
            <Input
              name="payeurEmail"
              type="email"
              defaultValue={(d?.payeurEmail as string) ?? ''}
            />
          </div>
          <div>
            <Label>{t('fields.payeurTelephone')}</Label>
            <Input name="payeurTelephone" defaultValue={(d?.payeurTelephone as string) ?? ''} />
          </div>
          <div className="col-span-2">
            <Label>{t('fields.payeurAdresse')}</Label>
            <Input name="payeurAdresse" defaultValue={(d?.payeurAdresse as string) ?? ''} />
          </div>
          <div>
            <Label>{t('fields.payeurCp')}</Label>
            <Input name="payeurCp" defaultValue={(d?.payeurCp as string) ?? ''} />
          </div>
          <div>
            <Label>{t('fields.payeurVille')}</Label>
            <Input name="payeurVille" defaultValue={(d?.payeurVille as string) ?? ''} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Planification</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t('fields.typePlannif')}</Label>
            <Select name="typePlannif" defaultValue={(d?.typePlannif as string) ?? 'INDETERMINE'}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_PLANNIF_OPTIONS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {t(`typePlannif.${v}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('fields.montantTtc')}</Label>
            <Input
              name="montantTtc"
              type="number"
              required
              defaultValue={d?.montantTtc != null ? String(d.montantTtc) : ''}
            />
          </div>
          <div>
            <Label>{t('fields.dateVolDeb')}</Label>
            <Input name="dateVolDeb" type="date" defaultValue={(d?.dateVolDeb as string) ?? ''} />
          </div>
          <div>
            <Label>{t('fields.dateVolFin')}</Label>
            <Input name="dateVolFin" type="date" defaultValue={(d?.dateVolFin as string) ?? ''} />
          </div>
          <div>
            <Label>{t('fields.dateValidite')}</Label>
            <Input
              name="dateValidite"
              type="date"
              defaultValue={(d?.dateValidite as string) ?? ''}
            />
          </div>
          <div>
            <Label>{t('fields.dateRappel')}</Label>
            <Input name="dateRappel" type="date" defaultValue={(d?.dateRappel as string) ?? ''} />
          </div>
          <div>
            <Label>{t('fields.lieuDecollage')}</Label>
            <Input name="lieuDecollage" defaultValue={(d?.lieuDecollage as string) ?? ''} />
          </div>
          <div>
            <Label>{t('fields.survol')}</Label>
            <Input name="survol" defaultValue={(d?.survol as string) ?? ''} />
          </div>
          <div>
            <Label>{t('fields.categorie')}</Label>
            <Input name="categorie" defaultValue={(d?.categorie as string) ?? ''} />
          </div>
          <div>
            <Label>{t('fields.provenance')}</Label>
            <Input name="provenance" defaultValue={(d?.provenance as string) ?? ''} />
          </div>
          <div className="col-span-2">
            <Label>{t('fields.commentaire')}</Label>
            <Textarea name="commentaire" defaultValue={(d?.commentaire as string) ?? ''} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Passagers</CardTitle>
        </CardHeader>
        <CardContent>
          <PassagerTableEditor passagers={passagers} onChange={setPassagers} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit">{t('save')}</Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/\(app\)/billets/ components/passager-table-editor.tsx
git commit -m "feat(ui): billet create/edit page with passager table editor"
```

---

### Task 12: Billet detail page + paiements

**Files:**

- Create: `app/[locale]/(app)/billets/[id]/page.tsx`
- Create: `components/paiement-form.tsx`

- [ ] **Step 1: Create paiement form component**

Create `components/paiement-form.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { addPaiement } from '@/lib/actions/paiement'

const MODES = ['ESPECES', 'CHEQUE', 'CB', 'VIREMENT', 'CHEQUE_VACANCES', 'AVOIR'] as const

type Props = {
  billetId: string
  locale: string
}

export function PaiementForm({ billetId, locale }: Props) {
  const t = useTranslations('paiements')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t('add')}
      </Button>
    )
  }

  async function handleSubmit(formData: FormData) {
    const result = await addPaiement(billetId, locale, formData)
    if (result?.error) {
      setError(result.error)
    } else {
      setOpen(false)
      setError(null)
    }
  }

  return (
    <form action={handleSubmit} className="border rounded p-4 space-y-3">
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t('fields.modePaiement')}</Label>
          <Select name="modePaiement" required>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODES.map((m) => (
                <SelectItem key={m} value={m}>
                  {t(`modes.${m}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t('fields.montantTtc')}</Label>
          <Input name="montantTtc" type="number" required />
        </div>
        <div>
          <Label>{t('fields.datePaiement')}</Label>
          <Input name="datePaiement" type="date" required />
        </div>
        <div>
          <Label>{t('fields.dateEncaissement')}</Label>
          <Input name="dateEncaissement" type="date" />
        </div>
        <div className="col-span-2">
          <Label>{t('fields.commentaire')}</Label>
          <Input name="commentaire" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          {t('add')}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Create billet detail page**

Create `app/[locale]/(app)/billets/[id]/page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PaiementForm } from '@/components/paiement-form'
import { cn } from '@/lib/utils'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

function formatCentimes(centimes: number): string {
  return (centimes / 100).toFixed(2) + ' EUR'
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function safeDecrypt(encrypted: string | null): number | null {
  if (!encrypted) return null
  try {
    return parseInt(decrypt(encrypted))
  } catch {
    return null
  }
}

export default async function BilletDetailPage({ params }: Props) {
  const { locale, id } = await params
  return requireAuth(async () => {
    const t = await getTranslations('billets')
    const tp = await getTranslations('paiements')
    const tpass = await getTranslations('passagers')

    const billet = await db.billet.findUnique({
      where: { id },
      include: {
        passagers: true,
        paiements: { orderBy: { datePaiement: 'desc' } },
      },
    })
    if (!billet) notFound()

    const totalPaye = billet.paiements.reduce((s, p) => s + p.montantTtc, 0)
    const soldeRestant = billet.montantTtc - totalPaye

    return (
      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/billets`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            {t('backToList')}
          </Link>
          <h1 className="text-2xl font-bold">{billet.reference}</h1>
          <Badge>{t(`statut.${billet.statut}`)}</Badge>
          <Badge variant="outline">{t(`statutPaiement.${billet.statutPaiement}`)}</Badge>
        </div>

        <div className="flex justify-end">
          <Link
            href={`/${locale}/billets/${id}/edit`}
            className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
          >
            {t('edit')}
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payeur</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <p className="text-muted-foreground">{t('fields.payeurNom')}</p>
              <p className="font-medium">
                {billet.payeurCiv} {billet.payeurPrenom} {billet.payeurNom}
              </p>
            </div>
            {billet.payeurEmail && (
              <div>
                <p className="text-muted-foreground">{t('fields.payeurEmail')}</p>
                <p className="font-medium">{billet.payeurEmail}</p>
              </div>
            )}
            {billet.payeurTelephone && (
              <div>
                <p className="text-muted-foreground">{t('fields.payeurTelephone')}</p>
                <p className="font-medium">{billet.payeurTelephone}</p>
              </div>
            )}
            {billet.payeurAdresse && (
              <div className="col-span-2">
                <p className="text-muted-foreground">{t('fields.payeurAdresse')}</p>
                <p className="font-medium">
                  {billet.payeurAdresse}, {billet.payeurCp} {billet.payeurVille}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Planification</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <p className="text-muted-foreground">{t('fields.typePlannif')}</p>
              <p className="font-medium">{t(`typePlannif.${billet.typePlannif}`)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('fields.montantTtc')}</p>
              <p className="font-medium">{formatCentimes(billet.montantTtc)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('fields.dateVolDeb')}</p>
              <p className="font-medium">{formatDate(billet.dateVolDeb)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('fields.dateVolFin')}</p>
              <p className="font-medium">{formatDate(billet.dateVolFin)}</p>
            </div>
            {billet.dateValidite && (
              <div>
                <p className="text-muted-foreground">{t('fields.dateValidite')}</p>
                <p className="font-medium">{formatDate(billet.dateValidite)}</p>
              </div>
            )}
            {billet.commentaire && (
              <div className="col-span-2">
                <p className="text-muted-foreground">{t('fields.commentaire')}</p>
                <p className="font-medium whitespace-pre-wrap">{billet.commentaire}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Passagers ({billet.passagers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tpass('fields.nom')}</TableHead>
                  <TableHead>{tpass('fields.age')}</TableHead>
                  <TableHead>{tpass('fields.poids')}</TableHead>
                  <TableHead>{tpass('fields.pmr')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billet.passagers.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.prenom} {p.nom}
                    </TableCell>
                    <TableCell>{p.age ?? '—'}</TableCell>
                    <TableCell>{safeDecrypt(p.poidsEncrypted) ?? '—'} kg</TableCell>
                    <TableCell>{p.pmr ? 'Oui' : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{tp('title')}</CardTitle>
              <span className="text-sm text-muted-foreground">
                {tp('solde')}: {formatCentimes(soldeRestant)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tp('fields.datePaiement')}</TableHead>
                  <TableHead>{tp('fields.modePaiement')}</TableHead>
                  <TableHead>{tp('fields.montantTtc')}</TableHead>
                  <TableHead>{tp('fields.commentaire')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billet.paiements.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.datePaiement)}</TableCell>
                    <TableCell>{tp(`modes.${p.modePaiement}`)}</TableCell>
                    <TableCell className={p.montantTtc < 0 ? 'text-red-600' : ''}>
                      {formatCentimes(p.montantTtc)}
                    </TableCell>
                    <TableCell>{p.commentaire ?? ''}</TableCell>
                  </TableRow>
                ))}
                {billet.paiements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                      Aucun paiement
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <PaiementForm billetId={billet.id} locale={locale} />
          </CardContent>
        </Card>
      </main>
    )
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/\(app\)/billets/\[id\]/page.tsx components/paiement-form.tsx
git commit -m "feat(ui): billet detail page with paiements list + add form"
```

---

### Task 13: Cron rappels email

**Files:**

- Create: `lib/email/rappels.ts`
- Create: `app/api/cron/rappels/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Implement rappel email builder**

Create `lib/email/rappels.ts`:

```ts
import { Resend } from 'resend'

type BilletRappel = {
  reference: string
  payeurNom: string
  payeurPrenom: string
  payeurTelephone: string | null
  commentaire: string | null
  billetUrl: string
}

function buildRow(b: BilletRappel): string {
  return `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">
        <a href="${b.billetUrl}" style="color: #2563eb;">${b.reference}</a>
      </td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${b.payeurPrenom} ${b.payeurNom}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${b.payeurTelephone ?? '—'}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${b.commentaire ?? ''}</td>
    </tr>`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function buildEmailHtml(
  exploitantName: string,
  billets: BilletRappel[],
  dateLabel: string,
): string {
  const rows = billets.map(buildRow).join('')
  const n = billets.length

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><title>Rappels billets</title></head>
<body style="font-family: Arial, sans-serif; color: #111827; background: #f9fafb; margin: 0; padding: 24px;">
  <div style="max-width: 640px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: #1e40af; color: #fff; padding: 20px 24px;">
      <h1 style="margin: 0; font-size: 18px;">Calpax — Rappels billets</h1>
      <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.85;">${exploitantName} — ${dateLabel}</p>
    </div>
    <div style="padding: 24px;">
      <p style="margin: 0 0 16px;">${n} billet${n > 1 ? 's' : ''} a recontacter aujourd'hui.</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background: #f3f4f6; text-align: left;">
            <th style="padding: 8px 12px; border-bottom: 2px solid #d1d5db;">Reference</th>
            <th style="padding: 8px 12px; border-bottom: 2px solid #d1d5db;">Payeur</th>
            <th style="padding: 8px 12px; border-bottom: 2px solid #d1d5db;">Telephone</th>
            <th style="padding: 8px 12px; border-bottom: 2px solid #d1d5db;">Commentaire</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin: 20px 0 0; font-size: 12px; color: #6b7280;">
        Cet email est genere automatiquement par Calpax. Ne pas repondre a ce message.
      </p>
    </div>
  </div>
</body>
</html>`
}

export async function sendRappelEmail(
  to: string[],
  exploitantName: string,
  billets: BilletRappel[],
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

  const from = process.env.EMAIL_FROM ?? 'no-reply@calpax.fr'
  const resend = new Resend(apiKey)

  const today = new Date()
  const dateLabel = formatDate(today)
  const n = billets.length
  const subject = `[Calpax] ${n} billet${n > 1 ? 's' : ''} a recontacter — ${dateLabel}`

  const html = buildEmailHtml(exploitantName, billets, dateLabel)

  await resend.emails.send({ from, to, subject, html })
}
```

- [ ] **Step 2: Implement cron endpoint**

Create `app/api/cron/rappels/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { basePrisma } from '@/lib/db/base'
import { sendRappelEmail } from '@/lib/email/rappels'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const billets = await basePrisma.billet.findMany({
    where: {
      dateRappel: { gte: today, lt: tomorrow },
      statut: { in: ['EN_ATTENTE', 'PLANIFIE'] },
    },
    include: {
      exploitant: { select: { id: true, name: true, email: true } },
    },
  })

  const grouped = new Map<
    string,
    { exploitant: { name: string; email: string | null }; billets: typeof billets }
  >()
  for (const billet of billets) {
    const key = billet.exploitantId
    if (!grouped.has(key)) {
      grouped.set(key, { exploitant: billet.exploitant, billets: [] })
    }
    grouped.get(key)!.billets.push(billet)
  }

  let sent = 0
  let skipped = 0

  for (const [, { exploitant, billets: expBillets }] of grouped) {
    const email = exploitant.email
    if (!email) {
      skipped++
      continue
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://calpax.fr'

    await sendRappelEmail(
      [email],
      exploitant.name,
      expBillets.map((b) => ({
        reference: b.reference,
        payeurNom: b.payeurNom,
        payeurPrenom: b.payeurPrenom,
        payeurTelephone: b.payeurTelephone,
        commentaire: b.commentaire,
        billetUrl: `${baseUrl}/fr/billets/${b.id}`,
      })),
    )
    sent++
  }

  logger.info(`Cron rappels: ${sent} emails sent, ${skipped} skipped`)

  return NextResponse.json({ sent, skipped })
}
```

- [ ] **Step 3: Add cron to vercel.json**

Add to the crons array in `vercel.json`:

```json
{
  "path": "/api/cron/rappels",
  "schedule": "0 7 * * *"
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/email/rappels.ts app/api/cron/rappels/route.ts vercel.json
git commit -m "feat(cron): daily billet reminder email via Vercel Cron + Resend"
```

---

### Task 14: RGPD droits interface

**Files:**

- Create: `lib/actions/rgpd.ts`
- Create: `app/[locale]/(app)/rgpd/page.tsx`

- [ ] **Step 1: Implement RGPD server actions**

Create `lib/actions/rgpd.ts`:

```ts
'use server'

import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'

export type PassagerSearchResult = {
  id: string
  prenom: string
  nom: string
  email: string | null
  telephone: string | null
  billetReference: string
  billetId: string
}

export async function searchPassagers(query: string): Promise<PassagerSearchResult[]> {
  return requireAuth(async () => {
    if (!query || query.length < 2) return []

    const passagers = await db.passager.findMany({
      where: {
        OR: [
          { nom: { contains: query, mode: 'insensitive' } },
          { prenom: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { telephone: { contains: query } },
        ],
      },
      include: { billet: { select: { id: true, reference: true } } },
      take: 50,
    })

    return passagers.map((p) => ({
      id: p.id,
      prenom: p.prenom,
      nom: p.nom,
      email: p.email,
      telephone: p.telephone,
      billetReference: p.billet.reference,
      billetId: p.billet.id,
    }))
  }) as Promise<PassagerSearchResult[]>
}

export async function exportPassagerData(passagerId: string): Promise<string> {
  return requireAuth(async () => {
    const passager = await db.passager.findUniqueOrThrow({
      where: { id: passagerId },
      include: {
        billet: {
          include: { paiements: true },
        },
      },
    })

    const poids = passager.poidsEncrypted
      ? (() => {
          try {
            return parseInt(decrypt(passager.poidsEncrypted))
          } catch {
            return null
          }
        })()
      : null

    const data = {
      passager: {
        prenom: passager.prenom,
        nom: passager.nom,
        email: passager.email,
        telephone: passager.telephone,
        age: passager.age,
        poids,
        pmr: passager.pmr,
      },
      billet: {
        reference: passager.billet.reference,
        statut: passager.billet.statut,
        montantTtc: passager.billet.montantTtc,
        paiements: passager.billet.paiements.map((p) => ({
          modePaiement: p.modePaiement,
          montantTtc: p.montantTtc,
          datePaiement: p.datePaiement,
        })),
      },
      exportedAt: new Date().toISOString(),
    }

    return JSON.stringify(data, null, 2)
  }) as Promise<string>
}

export async function anonymisePassager(passagerId: string): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const passager = await db.passager.findUniqueOrThrow({
      where: { id: passagerId },
    })

    // Check if linked to an archived vol — anonymise instead of delete
    await db.passager.update({
      where: { id: passagerId },
      data: {
        prenom: 'SUPPRIME',
        nom: 'SUPPRIME',
        email: null,
        telephone: null,
        age: null,
        poidsEncrypted: null,
        pmr: false,
      },
    })

    return {}
  })
}
```

- [ ] **Step 2: Create RGPD page**

Create `app/[locale]/(app)/rgpd/page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { RgpdClient } from './rgpd-client'

export default async function RgpdPage() {
  return requireAuth(async () => {
    const t = await getTranslations('rgpd')
    return (
      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <RgpdClient />
      </main>
    )
  })
}
```

Create `app/[locale]/(app)/rgpd/rgpd-client.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  searchPassagers,
  exportPassagerData,
  anonymisePassager,
  type PassagerSearchResult,
} from '@/lib/actions/rgpd'

export function RgpdClient() {
  const t = useTranslations('rgpd')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PassagerSearchResult[]>([])
  const [searched, setSearched] = useState(false)

  async function handleSearch() {
    const data = await searchPassagers(query)
    setResults(data)
    setSearched(true)
  }

  async function handleExport(passagerId: string) {
    const json = await exportPassagerData(passagerId)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `passager-${passagerId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleAnonymise(passagerId: string) {
    if (!confirm(t('actions.confirmAnonymise'))) return
    await anonymisePassager(passagerId)
    await handleSearch() // refresh
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch}>{t('search')}</Button>
      </div>

      {searched && results.length === 0 && (
        <p className="text-muted-foreground">{t('noResults')}</p>
      )}

      {results.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Billet</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  {r.prenom} {r.nom}
                </TableCell>
                <TableCell>{r.email ?? '—'}</TableCell>
                <TableCell>{r.billetReference}</TableCell>
                <TableCell className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => handleExport(r.id)}>
                    {t('actions.export')}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleAnonymise(r.id)}>
                    {t('actions.anonymise')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/actions/rgpd.ts app/\[locale\]/\(app\)/rgpd/
git commit -m "feat(rgpd): passager search, export JSON, anonymisation"
```

---

### Task 15: Tenant isolation integration tests

**Files:**

- Create: `tests/integration/billet-tenant.spec.ts`

- [ ] **Step 1: Write integration tests**

Create `tests/integration/billet-tenant.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { basePrisma } from '@/lib/db/base'
import { resetDb, seedTenant, asUser } from './helpers'
import { encrypt } from '@/lib/crypto'

async function seedBillet(exploitantId: string, reference: string) {
  return basePrisma.billet.create({
    data: {
      exploitantId,
      reference,
      checksum: '0',
      payeurPrenom: 'Test',
      payeurNom: 'Payeur',
      montantTtc: 15000,
      typePlannif: 'INDETERMINE',
      statut: 'EN_ATTENTE',
      statutPaiement: 'EN_ATTENTE',
    },
  })
}

async function seedPassager(exploitantId: string, billetId: string, nom: string) {
  return basePrisma.passager.create({
    data: {
      exploitantId,
      billetId,
      prenom: 'Test',
      nom,
      poidsEncrypted: encrypt('80'),
    },
  })
}

async function seedPaiement(exploitantId: string, billetId: string, montant: number) {
  return basePrisma.paiement.create({
    data: {
      exploitantId,
      billetId,
      modePaiement: 'CB',
      montantTtc: montant,
      datePaiement: new Date(),
    },
  })
}

describe('billet tenant isolation', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('findMany returns only current tenant billets', async () => {
    const A = await seedTenant('A')
    const B = await seedTenant('B')

    await seedBillet(A.exploitantId, 'A-2026-0001')
    await seedBillet(B.exploitantId, 'B-2026-0001')

    const billets = await asUser(A, 'GERANT', async () => db.billet.findMany())
    expect(billets).toHaveLength(1)
    expect(billets[0].reference).toBe('A-2026-0001')
  })

  it('passager findMany is tenant-isolated', async () => {
    const A = await seedTenant('A')
    const B = await seedTenant('B')

    const billetA = await seedBillet(A.exploitantId, 'A-2026-0001')
    const billetB = await seedBillet(B.exploitantId, 'B-2026-0001')

    await seedPassager(A.exploitantId, billetA.id, 'PassagerA')
    await seedPassager(B.exploitantId, billetB.id, 'PassagerB')

    const passagers = await asUser(A, 'GERANT', async () => db.passager.findMany())
    expect(passagers).toHaveLength(1)
    expect(passagers[0].nom).toBe('PassagerA')
  })

  it('paiement findMany is tenant-isolated', async () => {
    const A = await seedTenant('A')
    const B = await seedTenant('B')

    const billetA = await seedBillet(A.exploitantId, 'A-2026-0001')
    const billetB = await seedBillet(B.exploitantId, 'B-2026-0001')

    await seedPaiement(A.exploitantId, billetA.id, 5000)
    await seedPaiement(B.exploitantId, billetB.id, 3000)

    const paiements = await asUser(A, 'GERANT', async () => db.paiement.findMany())
    expect(paiements).toHaveLength(1)
    expect(paiements[0].montantTtc).toBe(5000)
  })

  it('create injects exploitantId automatically for billet', async () => {
    const A = await seedTenant('A')

    const created = await asUser(A, 'GERANT', async () =>
      db.billet.create({
        data: {
          reference: 'TEST-2026-0001',
          checksum: '0',
          payeurPrenom: 'Auto',
          payeurNom: 'Tenant',
          montantTtc: 10000,
        } as Record<string, unknown>,
      }),
    )

    const row = await basePrisma.billet.findUnique({
      where: { id: (created as { id: string }).id },
    })
    expect(row?.exploitantId).toBe(A.exploitantId)
  })
})
```

- [ ] **Step 2: Run integration tests**

```bash
npx vitest run tests/integration/billet-tenant.spec.ts --reporter=verbose
```

Expected: All 4 tests PASS.

- [ ] **Step 3: Run ALL tests to verify no regressions**

```bash
npx vitest run --reporter=verbose
```

Expected: All existing + new tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/billet-tenant.spec.ts
git commit -m "test(integration): tenant isolation for billet, passager, paiement"
```

---

### Task 16: Verify and fix

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run --reporter=verbose
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Run linter**

```bash
npx next lint
```

- [ ] **Step 4: Fix any issues found**

Address type errors, lint errors, or test failures.

- [ ] **Step 5: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: resolve p2a type and lint issues"
```

---

## P2a Checkpoint

Before starting P2b, verify:

- [ ] Billet CRUD works end-to-end (create, edit, detail)
- [ ] Passagers are created with encrypted weights
- [ ] Paiements can be added/deleted with auto statut recalc
- [ ] Sidebar shows Billets and RGPD links
- [ ] Cron rappels endpoint returns 200 with CRON_SECRET
- [ ] RGPD page: search, export JSON, anonymise work
- [ ] All integration tests pass (tenant isolation)
- [ ] All unit tests pass (reference, checksum, paiement statut)
- [ ] `npx tsc --noEmit` passes
- [ ] `npx next lint` passes
- [ ] Deploy to preview and verify on Vercel
