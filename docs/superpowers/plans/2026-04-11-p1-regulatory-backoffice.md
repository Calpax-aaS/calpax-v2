# P1 Regulatory Back-office Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the regulatory entities (Exploitant profile with logo, Ballon with temperature-dependent performance chart, Pilote with BFCL licence tracking), an alert system for upcoming certificate expirations (dashboard banners + weekly email digest), and RGPD technical foundations (encrypted pilot weight). Also fix TD-001 (TLS workaround).

**Architecture:** Extend the P0 multi-tenant Prisma pipeline with 2 new models (Ballon, Pilote) and extend Exploitant. Add `lib/regulatory/` for alert computation and blocking validation helpers. Add `lib/schemas/` for shared zod validation. UI uses shadcn Sidebar for navigation + standard CRUD pages with server actions. Logo upload via Supabase Storage with sharp resize. Weekly email digest via Vercel Cron + Resend.

**Tech Stack:** Prisma 7 (extend schema), shadcn/ui (Sidebar, Table, Form, Card, Badge, Toast), sharp (image resize), Supabase Storage (logo), Vercel Cron (weekly digest), Resend (email), zod (validation), react-hook-form.

**Spec reference:** `docs/superpowers/specs/2026-04-11-p1-regulatory-backoffice-design.md`

---

## File structure map

### Schema + seed

- `prisma/schema.prisma` — extend Exploitant, add Ballon + Pilote models
- `prisma/migrations/<timestamp>_p1_regulatory/` — migration
- `prisma/seed.ts` — extend with 9 ballons + 4 pilotes + Exploitant details

### Core libs

- `lib/regulatory/alerts.ts` — `getAlertsForExploitant()`, alert types, severity computation
- `lib/regulatory/validation.ts` — `isBallonFlightReady()`, `isPiloteAssignable()`
- `lib/schemas/ballon.ts` — zod schema for ballon form validation
- `lib/schemas/pilote.ts` — zod schema for pilote form validation
- `lib/schemas/exploitant.ts` — zod schema for exploitant settings form
- `lib/db/tenant-extension.ts` — add Ballon + Pilote to TENANT_FILTER
- `lib/db/base.ts` — fix SSL (TD-001)

### Server actions

- `lib/actions/exploitant.ts` — updateExploitant, uploadLogo
- `lib/actions/ballon.ts` — createBallon, updateBallon, toggleBallonActif
- `lib/actions/pilote.ts` — createPilote, updatePilote, togglePiloteActif

### UI components

- `components/ui/sidebar.tsx` — shadcn Sidebar (generated via CLI)
- `components/app-sidebar.tsx` — Calpax sidebar with nav links
- `components/alerts-banner.tsx` — dashboard alerts banner
- `components/performance-chart-input.tsx` — 25-row temperature/payload editor
- `components/performance-chart-display.tsx` — read-only chart table
- `components/expiry-badge.tsx` — color-coded expiry badge (green/orange/red)
- `components/logo-upload.tsx` — dropzone + preview

### Pages

- `app/[locale]/(app)/layout.tsx` — modify: add Sidebar + AlertsBanner
- `app/[locale]/(app)/page.tsx` — modify: update home page content
- `app/[locale]/(app)/settings/page.tsx` — exploitant settings form
- `app/[locale]/(app)/ballons/page.tsx` — ballons list
- `app/[locale]/(app)/ballons/new/page.tsx` — create ballon form
- `app/[locale]/(app)/ballons/[id]/page.tsx` — ballon detail
- `app/[locale]/(app)/ballons/[id]/edit/page.tsx` — edit ballon form
- `app/[locale]/(app)/pilotes/page.tsx` — pilotes list
- `app/[locale]/(app)/pilotes/new/page.tsx` — create pilote form
- `app/[locale]/(app)/pilotes/[id]/page.tsx` — pilote detail
- `app/[locale]/(app)/pilotes/[id]/edit/page.tsx` — edit pilote form
- `app/api/cron/digest/route.ts` — weekly email digest endpoint

### Config

- `vercel.json` — cron schedule for digest

### Tests

- `tests/unit/regulatory-alerts.spec.ts` — alert computation
- `tests/unit/regulatory-validation.spec.ts` — blocking helpers
- `tests/integration/ballon-tenant.spec.ts` — tenant isolation for Ballon
- `tests/integration/pilote-tenant.spec.ts` — tenant isolation for Pilote
- `tests/integration/pilote-crypto.spec.ts` — poids encryption round-trip

### i18n

- `messages/fr.json` — extend with P1 keys
- `messages/en.json` — extend with P1 keys

---

## Task index

**Phase A — TD-001 + schema** (tasks 1-4)
**Phase B — Core libs** (tasks 5-8)
**Phase C — Storage + logo** (tasks 9-10)
**Phase D — Sidebar + settings** (tasks 11-12)
**Phase E — Ballons CRUD** (tasks 13-15)
**Phase F — Pilotes CRUD** (tasks 16-18)
**Phase G — Alerts + cron** (tasks 19-21)
**Phase H — Tests + deploy** (tasks 22-24)

---

# Phase A — TD-001 + schema

---

## Task 1: Fix TD-001 (TLS workaround)

**Files:**

- Modify: `lib/db/base.ts`

- [ ] **Step 1: Download Supabase CA certificate**

In Supabase dashboard: Settings > Database > SSL > Download Certificate. Save the content.

This is a manual step. The cert content will be stored as a Vercel env var `SUPABASE_CA_CERT`.

- [ ] **Step 2: Update lib/db/base.ts to use CA cert**

Replace the SSL config in `lib/db/base.ts`:

```ts
import { Pool } from 'pg'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

declare global {
  // eslint-disable-next-line no-var
  var __prismaBase: PrismaClient | undefined
}

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }
  const isRemote =
    !connectionString.includes('127.0.0.1') && !connectionString.includes('localhost')

  let ssl: false | { ca?: string; rejectUnauthorized: boolean } = false
  if (isRemote) {
    const ca = process.env.SUPABASE_CA_CERT
    ssl = ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false }
  }

  const pool = new Pool({ connectionString, ssl })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

export const basePrisma = global.__prismaBase ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  global.__prismaBase = basePrisma
}
```

Logic: if `SUPABASE_CA_CERT` is set, use it with `rejectUnauthorized: true` (proper verification). If not set but remote, fall back to `rejectUnauthorized: false` (current behavior). Local dev uses no SSL.

- [ ] **Step 3: Add SUPABASE_CA_CERT to Vercel env vars**

Paste the cert content into Vercel > Settings > Environment Variables > `SUPABASE_CA_CERT`. All environments.

- [ ] **Step 4: Remove NODE_TLS_REJECT_UNAUTHORIZED from Vercel**

Delete the `NODE_TLS_REJECT_UNAUTHORIZED` env var from Vercel.

- [ ] **Step 5: Verify locally + run tests**

```bash
pnpm test && pnpm test:integration
```

Expected: all 28 tests pass (local uses no SSL).

- [ ] **Step 6: Update tech debt doc**

In `docs/TECH_DEBT.md`, update TD-001 status to resolved with the date.

- [ ] **Step 7: Commit**

```bash
git add lib/db/base.ts docs/TECH_DEBT.md
git commit -m "fix: replace NODE_TLS_REJECT_UNAUTHORIZED with supabase CA cert (TD-001)"
```

---

## Task 2: Prisma schema migration (extend Exploitant + add Ballon + Pilote)

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add P1 fields to Exploitant**

In `prisma/schema.prisma`, add after the existing Exploitant fields:

```prisma
model Exploitant {
  id          String   @id @default(cuid())
  name        String
  frDecNumber String   @unique
  users       User[]

  // P1 additions
  siret       String?
  numCamo     String?
  adresse     String?
  codePostal  String?
  ville       String?
  pays        String   @default("France")
  telephone   String?
  email       String?
  website     String?
  contactName String?
  logoUrl     String?

  ballons     Ballon[]
  pilotes     Pilote[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("exploitant")
}
```

- [ ] **Step 2: Add Ballon model**

```prisma
model Ballon {
  id                     String   @id @default(cuid())
  exploitantId           String
  exploitant             Exploitant @relation(fields: [exploitantId], references: [id], onDelete: Cascade)

  nom                    String
  immatriculation        String
  volume                 String
  nbPassagerMax          Int
  peseeAVide             Int
  configGaz              String
  manexAnnexRef          String
  mtom                   Int?
  mlm                    Int?
  performanceChart       Json

  camoOrganisme          String?
  camoExpiryDate         DateTime?
  certificatNavigabilite String?

  actif                  Boolean  @default(true)
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  @@unique([exploitantId, immatriculation])
  @@index([exploitantId])
  @@map("ballon")
}
```

- [ ] **Step 3: Add Pilote model**

```prisma
model Pilote {
  id                       String   @id @default(cuid())
  exploitantId             String
  exploitant               Exploitant @relation(fields: [exploitantId], references: [id], onDelete: Cascade)
  userId                   String?  @unique

  prenom                   String
  nom                      String
  email                    String?
  telephone                String?
  poidsEncrypted           String?

  licenceBfcl              String
  qualificationCommerciale Boolean  @default(false)
  dateExpirationLicence    DateTime
  classesBallon            String[]
  heuresDeVol              Int?

  actif                    Boolean  @default(true)
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  @@index([exploitantId])
  @@map("pilote")
}
```

- [ ] **Step 4: Format and generate**

```bash
pnpm exec prisma format
pnpm exec prisma generate
```

- [ ] **Step 5: Create migration**

```bash
pnpm exec prisma migrate dev --name p1_regulatory
```

Expected: migration created and applied to local Supabase.

- [ ] **Step 6: Verify tables in Studio**

```bash
pnpm exec prisma studio
```

Expected: `ballon` and `pilote` tables visible with correct columns. Exploitant table has new columns.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(prisma): p1 schema — extend exploitant, add ballon + pilote"
```

---

## Task 3: Update TENANT_FILTER + tenant isolation tests

**Files:**

- Modify: `lib/db/tenant-extension.ts`
- Create: `tests/integration/ballon-tenant.spec.ts`
- Create: `tests/integration/pilote-tenant.spec.ts`

- [ ] **Step 1: Add Ballon and Pilote to TENANT_FILTER**

In `lib/db/tenant-extension.ts`, update the TENANT_FILTER:

```ts
export const TENANT_FILTER: Record<string, string> = {
  Exploitant: 'id',
  User: 'exploitantId',
  AuditLog: 'exploitantId',
  Ballon: 'exploitantId',
  Pilote: 'exploitantId',
}
```

- [ ] **Step 2: Write Ballon tenant isolation test**

Create `tests/integration/ballon-tenant.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { basePrisma } from '@/lib/db/base'
import { resetDb, seedTenant, asUser } from './helpers'

describe('ballon tenant isolation', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('findMany returns only current tenant ballons', async () => {
    const A = await seedTenant('A')
    const B = await seedTenant('B')

    await basePrisma.ballon.create({
      data: {
        exploitantId: A.exploitantId,
        nom: 'Ballon A',
        immatriculation: 'F-AAAA',
        volume: 'Z-105',
        nbPassagerMax: 4,
        peseeAVide: 376,
        configGaz: '4x23kg',
        manexAnnexRef: 'Annexe 5.1',
        performanceChart: { '20': 365 },
      },
    })
    await basePrisma.ballon.create({
      data: {
        exploitantId: B.exploitantId,
        nom: 'Ballon B',
        immatriculation: 'F-BBBB',
        volume: 'Z-90',
        nbPassagerMax: 3,
        peseeAVide: 343,
        configGaz: '4x23kg',
        manexAnnexRef: 'Annexe 5.2',
        performanceChart: { '20': 292 },
      },
    })

    const ballons = await asUser(A, 'GERANT', async () => db.ballon.findMany())
    expect(ballons).toHaveLength(1)
    expect(ballons[0]?.immatriculation).toBe('F-AAAA')
  })

  it('create injects exploitantId', async () => {
    const A = await seedTenant('A')
    const created = await asUser(A, 'GERANT', async () =>
      db.ballon.create({
        data: {
          nom: 'New',
          immatriculation: 'F-NEW1',
          volume: 'Z-105',
          nbPassagerMax: 4,
          peseeAVide: 376,
          configGaz: '4x23kg',
          manexAnnexRef: 'Annexe 5.1',
          performanceChart: { '20': 365 },
        },
      }),
    )
    expect(created.exploitantId).toBe(A.exploitantId)
  })
})
```

- [ ] **Step 3: Write Pilote tenant isolation test**

Create `tests/integration/pilote-tenant.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { basePrisma } from '@/lib/db/base'
import { resetDb, seedTenant, asUser } from './helpers'

describe('pilote tenant isolation', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('findMany returns only current tenant pilotes', async () => {
    const A = await seedTenant('A')
    const B = await seedTenant('B')

    await basePrisma.pilote.create({
      data: {
        exploitantId: A.exploitantId,
        prenom: 'Jean',
        nom: 'Dupont',
        licenceBfcl: 'BFCL-001',
        qualificationCommerciale: true,
        dateExpirationLicence: new Date('2027-06-01'),
        classesBallon: ['A'],
      },
    })
    await basePrisma.pilote.create({
      data: {
        exploitantId: B.exploitantId,
        prenom: 'Pierre',
        nom: 'Martin',
        licenceBfcl: 'BFCL-002',
        qualificationCommerciale: true,
        dateExpirationLicence: new Date('2027-06-01'),
        classesBallon: ['A'],
      },
    })

    const pilotes = await asUser(A, 'GERANT', async () => db.pilote.findMany())
    expect(pilotes).toHaveLength(1)
    expect(pilotes[0]?.nom).toBe('Dupont')
  })
})
```

- [ ] **Step 4: Update resetDb helper**

In `tests/integration/helpers.ts`, add Ballon and Pilote cleanup before User:

```ts
export async function resetDb() {
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

- [ ] **Step 5: Run tests**

```bash
pnpm test:integration
```

Expected: all previous tests pass + 2 new ballon tests + 1 new pilote test.

- [ ] **Step 6: Commit**

```bash
git add lib/db/tenant-extension.ts tests/integration/
git commit -m "feat(db): tenant isolation for ballon + pilote with integration tests"
```

---

## Task 4: Seed data (9 ballons + 4 pilotes + Exploitant details)

**Files:**

- Modify: `prisma/seed.ts`

- [ ] **Step 1: Extend seed with Exploitant details + ballons + pilotes**

Replace `prisma/seed.ts` with the full P1 seed that:

1. Updates Cameron Balloons exploitant with SIRET, adresse (Dole, Jura), numCamo (OSAC)
2. Creates 9 ballons with full performance charts from v1
3. Creates 4 pilotes from v1 (Olivier 92kg, Eric 86kg, Max 75kg, Herve 94kg)
4. Pilote weights encrypted via `lib/crypto`
5. Varied CAMO expiry dates for alert testing (some near-expiry, some far)
6. Varied BFCL expiry dates (one near-expiry for alert testing)

The seed file will be long (~300 lines) because of the 9 performance charts. Each chart has 25 entries (10-34 degrees). All values are extracted from `v1-reference/create-ficheVol-pdf.php`.

Key data points for the 9 ballons:

```ts
const ballonsData = [
  {
    nom: 'F-HFCC',
    immatriculation: 'F-HFCC',
    volume: 'Z-105 (3000 m3)',
    peseeAVide: 376,
    configGaz: '4xCB2990 : 4x23 kg',
    manexAnnexRef: 'Manex - Annexe 5.4',
    nbPassagerMax: 4,
    performanceChart: {
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
    },
  },
  {
    nom: 'F-HTLT',
    immatriculation: 'F-HTLT',
    volume: 'Z-133 (3700 m3)',
    peseeAVide: 485,
    mtom: 1206,
    mlm: 603,
    configGaz: '2xCB2901+1xCB2380:2x30+29kg ou 2xCB2901+2xCB2385:2x30+2x23kg',
    manexAnnexRef: 'Manex - Annexe 5.6',
    nbPassagerMax: 6,
    performanceChart: {
      '10': 602,
      '11': 587,
      '12': 571,
      '13': 556,
      '14': 541,
      '15': 526,
      '16': 512,
      '17': 497,
      '18': 482,
      '19': 468,
      '20': 454,
      '21': 439,
      '22': 425,
      '23': 411,
      '24': 397,
      '25': 383,
      '26': 369,
      '27': 356,
      '28': 342,
      '29': 328,
      '30': 315,
      '31': 302,
      '32': 288,
      '33': 275,
      '34': 262,
    },
  },
  {
    nom: 'F-HMJD',
    immatriculation: 'F-HMJD',
    volume: 'Z-133 (3700 m3)',
    peseeAVide: 492,
    mtom: 1206,
    mlm: 603,
    configGaz: '2xCB2901+1xCB2380:2x30+29kg ou 2xCB2901+2xCB2385:2x30+2x23kg',
    manexAnnexRef: 'Manex - Annexe 5.6',
    nbPassagerMax: 6,
    performanceChart: {
      '10': 595,
      '11': 580,
      '12': 564,
      '13': 549,
      '14': 534,
      '15': 519,
      '16': 505,
      '17': 490,
      '18': 475,
      '19': 461,
      '20': 447,
      '21': 432,
      '22': 418,
      '23': 404,
      '24': 390,
      '25': 376,
      '26': 362,
      '27': 349,
      '28': 335,
      '29': 321,
      '30': 308,
      '31': 295,
      '32': 281,
      '33': 268,
      '34': 255,
    },
  },
  {
    nom: 'F-HCPJ',
    immatriculation: 'F-HCPJ',
    volume: 'Z-90 (2600 m3)',
    peseeAVide: 343,
    mtom: 816,
    mlm: 0,
    configGaz: '4xCB2385 : 4x23 kg',
    manexAnnexRef: 'Manex - Annexe 5.2',
    nbPassagerMax: 3,
    performanceChart: {
      '10': 393,
      '11': 382,
      '12': 372,
      '13': 362,
      '14': 351,
      '15': 341,
      '16': 331,
      '17': 321,
      '18': 312,
      '19': 302,
      '20': 292,
      '21': 282,
      '22': 273,
      '23': 263,
      '24': 254,
      '25': 244,
      '26': 235,
      '27': 226,
      '28': 217,
      '29': 207,
      '30': 198,
      '31': 189,
      '32': 180,
      '33': 171,
      '34': 163,
    },
  },
  {
    nom: 'F-HCBF',
    immatriculation: 'F-HCBF',
    volume: 'Z-77 (2200 m3)',
    peseeAVide: 342,
    mtom: 703,
    mlm: 0,
    configGaz: '4xCB2990 : 4x23 kg',
    manexAnnexRef: 'Manex - Annexe 5.1',
    nbPassagerMax: 2,
    performanceChart: {
      '10': 287,
      '11': 278,
      '12': 270,
      '13': 261,
      '14': 252,
      '15': 244,
      '16': 235,
      '17': 226,
      '18': 218,
      '19': 210,
      '20': 201,
      '21': 193,
      '22': 185,
      '23': 177,
      '24': 169,
      '25': 161,
      '26': 153,
      '27': 145,
      '28': 137,
      '29': 129,
      '30': 121,
      '31': 113,
      '32': 106,
      '33': 98,
      '34': 91,
    },
  },
  {
    nom: 'F-HCDS',
    immatriculation: 'F-HCDS',
    volume: 'Z-77 (2200 m3)',
    peseeAVide: 344,
    mtom: 703,
    mlm: 0,
    configGaz: '4xCB2990 : 4x23 kg',
    manexAnnexRef: 'Manex - Annexe 5.1',
    nbPassagerMax: 2,
    performanceChart: {
      '10': 285,
      '11': 276,
      '12': 268,
      '13': 259,
      '14': 250,
      '15': 242,
      '16': 233,
      '17': 224,
      '18': 216,
      '19': 208,
      '20': 199,
      '21': 191,
      '22': 183,
      '23': 175,
      '24': 167,
      '25': 159,
      '26': 151,
      '27': 143,
      '28': 135,
      '29': 127,
      '30': 119,
      '31': 111,
      '32': 104,
      '33': 96,
      '34': 89,
    },
  },
  {
    nom: 'F-GVGD',
    immatriculation: 'F-GVGD',
    volume: 'Z-120 (3400 m3)',
    peseeAVide: 467,
    mtom: 1088,
    mlm: 544,
    configGaz: '3xCB2901:3x30kg ou 2xCB2901+1xCB2380:2x30+29kg',
    manexAnnexRef: 'Manex - Annexe 5.5',
    nbPassagerMax: 5,
    performanceChart: {
      '10': 514,
      '11': 500,
      '12': 486,
      '13': 473,
      '14': 459,
      '15': 446,
      '16': 432,
      '17': 419,
      '18': 406,
      '19': 393,
      '20': 380,
      '21': 367,
      '22': 354,
      '23': 341,
      '24': 329,
      '25': 316,
      '26': 304,
      '27': 291,
      '28': 279,
      '29': 267,
      '30': 255,
      '31': 243,
      '32': 231,
      '33': 219,
      '34': 207,
    },
  },
  {
    nom: 'F-HACK',
    immatriculation: 'F-HACK',
    volume: 'Z-225 (6400 m3)',
    peseeAVide: 746,
    mtom: 2041,
    mlm: 1021,
    configGaz: '4xCB2903 : 4x36 kg',
    manexAnnexRef: 'Manex - Annexe 5.7',
    nbPassagerMax: 12,
    performanceChart: {
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
    },
  },
  {
    nom: 'F-HPLM',
    immatriculation: 'F-HPLM',
    volume: 'Z-105 (3000 m3)',
    peseeAVide: 378,
    mtom: 952,
    mlm: 476,
    configGaz: '4xCB2385 : 4x23 kg',
    manexAnnexRef: 'Manex - Annexe 5.3',
    nbPassagerMax: 4,
    performanceChart: {
      '10': 480,
      '11': 468,
      '12': 456,
      '13': 444,
      '14': 432,
      '15': 420,
      '16': 409,
      '17': 397,
      '18': 386,
      '19': 374,
      '20': 363,
      '21': 352,
      '22': 340,
      '23': 329,
      '24': 318,
      '25': 307,
      '26': 296,
      '27': 286,
      '28': 275,
      '29': 264,
      '30': 254,
      '31': 243,
      '32': 233,
      '33': 222,
      '34': 212,
    },
  },
]
```

Pilotes seed data:

```ts
const pilotesData = [
  {
    prenom: 'Olivier',
    nom: 'Cuenot',
    poids: 92,
    telephone: '0680344117',
    email: 'olivier.cuenot@cameronfrance.com',
    licenceBfcl: 'BFCL-CBF-001',
    qualificationCommerciale: true,
    classesBallon: ['A'],
    heuresDeVol: 2500,
    dateExpirationLicence: new Date('2027-03-15'), // far — no alert
  },
  {
    prenom: 'Eric',
    nom: 'Plantade',
    poids: 86,
    telephone: '0616531560',
    licenceBfcl: 'BFCL-CBF-002',
    qualificationCommerciale: true,
    classesBallon: ['A'],
    heuresDeVol: 800,
    dateExpirationLicence: new Date('2026-05-15'), // ~34 days — WARNING
  },
  {
    prenom: 'Max',
    nom: 'Thomas',
    poids: 75,
    telephone: '0676390635',
    licenceBfcl: 'BFCL-CBF-003',
    qualificationCommerciale: true,
    classesBallon: ['A'],
    heuresDeVol: 400,
    dateExpirationLicence: new Date('2026-04-25'), // ~14 days — CRITICAL
  },
  {
    prenom: 'Herve',
    nom: 'Daclin',
    poids: 94,
    licenceBfcl: 'BFCL-CBF-004',
    qualificationCommerciale: true,
    classesBallon: ['A', 'B'],
    heuresDeVol: 1200,
    dateExpirationLicence: new Date('2027-09-01'), // far — no alert
  },
]
```

Exploitant updates and CAMO dates:

- Cameron Balloons: SIRET placeholder, adresse "Route de Brevans, 39100 Dole", numCamo "OSAC"
- Ballons CAMO dates: varied (some 2026-05-20 = ~39 days WARNING, some 2027-01-01 = far, one 2026-04-20 = ~9 days CRITICAL)

The seed uses `upsert` by `immatriculation` for ballons and `licenceBfcl` for pilotes (idempotent).
Pilote poids encrypted via `import { encrypt } from '@/lib/crypto'`.

- [ ] **Step 2: Run seed**

```bash
pnpm exec prisma db seed
```

Expected: 2 exploitants, 9 ballons, 4 pilotes seeded.

- [ ] **Step 3: Verify in Studio**

Open Prisma Studio, check ballon table has 9 rows, pilote table has 4 rows, pilote.poidsEncrypted contains base64 strings (not plain numbers).

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(seed): 9 cameron balloons ballons + 4 pilotes with v1 performance charts"
```

---

# Phase B — Core libs

---

## Task 5: lib/regulatory/alerts.ts (TDD)

**Files:**

- Create: `lib/regulatory/alerts.ts`
- Test: `tests/unit/regulatory-alerts.spec.ts`

- [ ] **Step 1: Write failing test**

Create `tests/unit/regulatory-alerts.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeAlertSeverity, type AlertSeverity } from '@/lib/regulatory/alerts'

describe('computeAlertSeverity', () => {
  const today = new Date('2026-04-11')

  it('returns EXPIRED when date is in the past', () => {
    expect(computeAlertSeverity(new Date('2026-04-10'), 'CAMO', today)).toBe('EXPIRED')
    expect(computeAlertSeverity(new Date('2026-03-01'), 'BFCL', today)).toBe('EXPIRED')
  })

  it('returns CRITICAL for CAMO within 30 days', () => {
    expect(computeAlertSeverity(new Date('2026-04-20'), 'CAMO', today)).toBe('CRITICAL') // 9 days
    expect(computeAlertSeverity(new Date('2026-05-10'), 'CAMO', today)).toBe('CRITICAL') // 29 days
  })

  it('returns WARNING for CAMO 31-60 days', () => {
    expect(computeAlertSeverity(new Date('2026-05-15'), 'CAMO', today)).toBe('WARNING') // 34 days
    expect(computeAlertSeverity(new Date('2026-06-10'), 'CAMO', today)).toBe('WARNING') // 60 days
  })

  it('returns OK for CAMO beyond 60 days', () => {
    expect(computeAlertSeverity(new Date('2026-06-11'), 'CAMO', today)).toBe('OK') // 61 days
    expect(computeAlertSeverity(new Date('2027-01-01'), 'CAMO', today)).toBe('OK')
  })

  it('returns CRITICAL for BFCL within 30 days', () => {
    expect(computeAlertSeverity(new Date('2026-04-25'), 'BFCL', today)).toBe('CRITICAL') // 14 days
  })

  it('returns WARNING for BFCL 31-90 days', () => {
    expect(computeAlertSeverity(new Date('2026-05-15'), 'BFCL', today)).toBe('WARNING') // 34 days
    expect(computeAlertSeverity(new Date('2026-07-09'), 'BFCL', today)).toBe('WARNING') // 89 days
  })

  it('returns OK for BFCL beyond 90 days', () => {
    expect(computeAlertSeverity(new Date('2026-07-11'), 'BFCL', today)).toBe('OK') // 91 days
  })
})
```

- [ ] **Step 2: Run test — should fail**

```bash
pnpm test tests/unit/regulatory-alerts.spec.ts
```

- [ ] **Step 3: Implement lib/regulatory/alerts.ts**

```ts
// lib/regulatory/alerts.ts

export type AlertSeverity = 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'OK'
export type AlertType = 'CAMO_EXPIRY' | 'BFCL_EXPIRY'

export type Alert = {
  severity: AlertSeverity
  entityType: 'BALLON' | 'PILOTE'
  entityId: string
  entityName: string
  alertType: AlertType
  expiryDate: Date
  daysRemaining: number
}

const THRESHOLDS = {
  CAMO: { warning: 60, critical: 30 },
  BFCL: { warning: 90, critical: 30 },
} as const

type ThresholdKey = keyof typeof THRESHOLDS

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

export function computeAlertSeverity(
  expiryDate: Date,
  type: ThresholdKey,
  today: Date = new Date(),
): AlertSeverity {
  const days = daysBetween(today, expiryDate)
  if (days <= 0) return 'EXPIRED'
  if (days <= THRESHOLDS[type].critical) return 'CRITICAL'
  if (days <= THRESHOLDS[type].warning) return 'WARNING'
  return 'OK'
}

export function buildBallonAlerts(
  ballons: Array<{
    id: string
    immatriculation: string
    camoExpiryDate: Date | null
    actif: boolean
  }>,
  today: Date = new Date(),
): Alert[] {
  const alerts: Alert[] = []
  for (const b of ballons) {
    if (!b.actif || !b.camoExpiryDate) continue
    const severity = computeAlertSeverity(b.camoExpiryDate, 'CAMO', today)
    if (severity === 'OK') continue
    alerts.push({
      severity,
      entityType: 'BALLON',
      entityId: b.id,
      entityName: b.immatriculation,
      alertType: 'CAMO_EXPIRY',
      expiryDate: b.camoExpiryDate,
      daysRemaining: daysBetween(today, b.camoExpiryDate),
    })
  }
  return alerts
}

export function buildPiloteAlerts(
  pilotes: Array<{
    id: string
    prenom: string
    nom: string
    dateExpirationLicence: Date
    actif: boolean
  }>,
  today: Date = new Date(),
): Alert[] {
  const alerts: Alert[] = []
  for (const p of pilotes) {
    if (!p.actif) continue
    const severity = computeAlertSeverity(p.dateExpirationLicence, 'BFCL', today)
    if (severity === 'OK') continue
    alerts.push({
      severity,
      entityType: 'PILOTE',
      entityId: p.id,
      entityName: `${p.prenom} ${p.nom}`,
      alertType: 'BFCL_EXPIRY',
      expiryDate: p.dateExpirationLicence,
      daysRemaining: daysBetween(today, p.dateExpirationLicence),
    })
  }
  return alerts
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  EXPIRED: 0,
  CRITICAL: 1,
  WARNING: 2,
  OK: 3,
}

export function sortAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}
```

- [ ] **Step 4: Run test — should pass**

```bash
pnpm test tests/unit/regulatory-alerts.spec.ts
```

Expected: 7 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/regulatory/alerts.ts tests/unit/regulatory-alerts.spec.ts
git commit -m "feat(regulatory): alert severity computation with tdd"
```

---

## Task 6: lib/regulatory/validation.ts (TDD)

**Files:**

- Create: `lib/regulatory/validation.ts`
- Test: `tests/unit/regulatory-validation.spec.ts`

- [ ] **Step 1: Write failing test**

Create `tests/unit/regulatory-validation.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isBallonFlightReady, isPiloteAssignable } from '@/lib/regulatory/validation'

describe('isBallonFlightReady', () => {
  const validBallon = {
    actif: true,
    camoExpiryDate: new Date('2027-01-01'),
  }

  it('returns valid for active ballon with future CAMO', () => {
    expect(isBallonFlightReady(validBallon)).toEqual({ valid: true })
  })

  it('returns invalid if not actif', () => {
    const result = isBallonFlightReady({ ...validBallon, actif: false })
    expect(result.valid).toBe(false)
  })

  it('returns invalid if CAMO expired', () => {
    const result = isBallonFlightReady({
      ...validBallon,
      camoExpiryDate: new Date('2020-01-01'),
    })
    expect(result.valid).toBe(false)
  })

  it('returns invalid if CAMO date is null', () => {
    const result = isBallonFlightReady({ ...validBallon, camoExpiryDate: null })
    expect(result.valid).toBe(false)
  })
})

describe('isPiloteAssignable', () => {
  const validPilote = {
    actif: true,
    dateExpirationLicence: new Date('2027-01-01'),
    qualificationCommerciale: true,
    classesBallon: ['A', 'B'],
  }

  it('returns valid for qualified active pilot', () => {
    expect(isPiloteAssignable(validPilote)).toEqual({ valid: true })
  })

  it('returns invalid if not actif', () => {
    expect(isPiloteAssignable({ ...validPilote, actif: false }).valid).toBe(false)
  })

  it('returns invalid if licence expired', () => {
    expect(
      isPiloteAssignable({ ...validPilote, dateExpirationLicence: new Date('2020-01-01') }).valid,
    ).toBe(false)
  })

  it('returns invalid if no commercial qualification', () => {
    expect(isPiloteAssignable({ ...validPilote, qualificationCommerciale: false }).valid).toBe(
      false,
    )
  })

  it('returns invalid if required class not in pilot classes', () => {
    expect(isPiloteAssignable(validPilote, 'C').valid).toBe(false)
  })

  it('returns valid if required class is in pilot classes', () => {
    expect(isPiloteAssignable(validPilote, 'A')).toEqual({ valid: true })
  })
})
```

- [ ] **Step 2: Run test — should fail**

- [ ] **Step 3: Implement lib/regulatory/validation.ts**

```ts
// lib/regulatory/validation.ts

export type ValidationResult = { valid: true } | { valid: false; reason: string }

type BallonForValidation = {
  actif: boolean
  camoExpiryDate: Date | null
}

type PiloteForValidation = {
  actif: boolean
  dateExpirationLicence: Date
  qualificationCommerciale: boolean
  classesBallon: string[]
}

export function isBallonFlightReady(ballon: BallonForValidation): ValidationResult {
  if (!ballon.actif) {
    return { valid: false, reason: 'Ballon is deactivated' }
  }
  if (!ballon.camoExpiryDate) {
    return { valid: false, reason: 'No CAMO expiry date set' }
  }
  if (ballon.camoExpiryDate <= new Date()) {
    return { valid: false, reason: 'CAMO certificate has expired' }
  }
  return { valid: true }
}

export function isPiloteAssignable(
  pilote: PiloteForValidation,
  requiredBallonClass?: string,
): ValidationResult {
  if (!pilote.actif) {
    return { valid: false, reason: 'Pilot is deactivated' }
  }
  if (pilote.dateExpirationLicence <= new Date()) {
    return { valid: false, reason: 'BFCL licence has expired' }
  }
  if (!pilote.qualificationCommerciale) {
    return { valid: false, reason: 'Pilot does not have commercial flight qualification' }
  }
  if (requiredBallonClass && !pilote.classesBallon.includes(requiredBallonClass)) {
    return {
      valid: false,
      reason: `Pilot is not qualified for balloon class ${requiredBallonClass}`,
    }
  }
  return { valid: true }
}
```

- [ ] **Step 4: Run test — should pass**

Expected: 10 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/regulatory/validation.ts tests/unit/regulatory-validation.spec.ts
git commit -m "feat(regulatory): blocking validation helpers with tdd"
```

---

## Task 7: Zod schemas (ballon + pilote + exploitant)

**Files:**

- Create: `lib/schemas/ballon.ts`
- Create: `lib/schemas/pilote.ts`
- Create: `lib/schemas/exploitant.ts`

- [ ] **Step 1: Write lib/schemas/ballon.ts**

```ts
import { z } from 'zod'

export const performanceChartSchema = z.record(z.string().regex(/^\d{1,2}$/), z.number().positive())

export const ballonSchema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  immatriculation: z.string().min(1, 'Immatriculation requise').max(15),
  volume: z.string().min(1, 'Volume requis'),
  nbPassagerMax: z.coerce.number().int().positive('Nombre de passagers requis'),
  peseeAVide: z.coerce.number().int().positive('Pesee requise'),
  configGaz: z.string().min(1, 'Configuration gaz requise'),
  manexAnnexRef: z.string().min(1, 'Reference Manex requise'),
  mtom: z.coerce.number().int().positive().optional(),
  mlm: z.coerce.number().int().nonnegative().optional(),
  performanceChart: performanceChartSchema,
  camoOrganisme: z.string().optional(),
  camoExpiryDate: z.coerce.date().optional(),
  certificatNavigabilite: z.string().optional(),
})

export type BallonFormData = z.infer<typeof ballonSchema>
```

- [ ] **Step 2: Write lib/schemas/pilote.ts**

```ts
import { z } from 'zod'

export const piloteSchema = z.object({
  prenom: z.string().min(1, 'Prenom requis'),
  nom: z.string().min(1, 'Nom requis'),
  email: z.string().email().optional().or(z.literal('')),
  telephone: z.string().optional(),
  poids: z.coerce.number().positive().optional(),
  licenceBfcl: z.string().min(1, 'Licence BFCL requise'),
  qualificationCommerciale: z.coerce.boolean(),
  dateExpirationLicence: z.coerce.date(),
  classesBallon: z.array(z.string()).min(1, 'Au moins une classe requise'),
  heuresDeVol: z.coerce.number().int().nonnegative().optional(),
})

export type PiloteFormData = z.infer<typeof piloteSchema>
```

- [ ] **Step 3: Write lib/schemas/exploitant.ts**

```ts
import { z } from 'zod'

export const exploitantSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  frDecNumber: z.string().min(1, 'Numero FR.DEC requis'),
  siret: z.string().optional(),
  numCamo: z.string().optional(),
  adresse: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
  pays: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  contactName: z.string().optional(),
})

export type ExploitantFormData = z.infer<typeof exploitantSchema>
```

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add lib/schemas/
git commit -m "feat(schemas): zod validation for ballon, pilote, exploitant forms"
```

---

## Task 8: Pilote poids encryption integration test

**Files:**

- Create: `tests/integration/pilote-crypto.spec.ts`

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { basePrisma } from '@/lib/db/base'
import { encrypt, decrypt } from '@/lib/crypto'
import { resetDb, seedTenant } from './helpers'

describe('pilote poids encryption', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('stores poids as encrypted ciphertext, decrypts back to original', async () => {
    const A = await seedTenant('A')
    const poids = 85
    const encrypted = encrypt(poids.toString())

    const pilote = await basePrisma.pilote.create({
      data: {
        exploitantId: A.exploitantId,
        prenom: 'Test',
        nom: 'Pilot',
        licenceBfcl: 'BFCL-TEST',
        qualificationCommerciale: true,
        dateExpirationLicence: new Date('2027-01-01'),
        classesBallon: ['A'],
        poidsEncrypted: encrypted,
      },
    })

    // Raw DB value should be base64 ciphertext, not "85"
    expect(pilote.poidsEncrypted).not.toBe('85')
    expect(pilote.poidsEncrypted).not.toBeNull()

    // Decrypt should return original value
    const decrypted = decrypt(pilote.poidsEncrypted!)
    expect(Number(decrypted)).toBe(poids)
  })
})
```

- [ ] **Step 2: Run test**

```bash
pnpm test:integration
```

Expected: all previous + 1 new test passing.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/pilote-crypto.spec.ts
git commit -m "test: pilote poids encryption round-trip integration test"
```

---

# Phase C — Storage + logo

---

## Task 9: Supabase Storage setup + logo upload server action

**Files:**

- Create: `lib/actions/exploitant.ts`

- [ ] **Step 1: Create the logos bucket in Supabase**

Via Supabase Dashboard > Storage > Create Bucket:

- Name: `logos`
- Public: true (logos are displayed in the UI)
- File size limit: 2 MB
- Allowed MIME types: `image/png, image/jpeg, image/svg+xml`

Or via the Supabase CLI / SQL:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);
```

This is a manual step for the deployed environment. For local dev, the bucket is created by the seed or manually.

- [ ] **Step 2: Install @supabase/supabase-js**

```bash
pnpm add @supabase/supabase-js
```

- [ ] **Step 3: Write lib/actions/exploitant.ts**

```ts
'use server'

import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'
import { exploitantSchema } from '@/lib/schemas/exploitant'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function getStorageClient() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function updateExploitant(formData: FormData) {
  return requireAuth(async () => {
    const ctx = getContext()
    const raw = Object.fromEntries(formData.entries())
    const parsed = exploitantSchema.parse(raw)

    await db.exploitant.update({
      where: { id: ctx.exploitantId },
      data: parsed,
    })

    return { success: true }
  })
}

export async function uploadLogo(formData: FormData) {
  return requireAuth(async () => {
    const ctx = getContext()
    const file = formData.get('logo') as File | null
    if (!file) throw new Error('No file provided')

    // Validate
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) throw new Error('File too large (max 2 MB)')
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml']
    if (!allowed.includes(file.type)) throw new Error('Invalid file type')

    // Resize with sharp
    const buffer = Buffer.from(await file.arrayBuffer())
    const resized = await sharp(buffer)
      .resize({ width: 400, withoutEnlargement: true })
      .png({ quality: 85 })
      .toBuffer()

    // Upload to Supabase Storage
    const storage = getStorageClient().storage
    const path = `${ctx.exploitantId}/logo.png`
    const { error } = await storage.from('logos').upload(path, resized, {
      contentType: 'image/png',
      upsert: true,
    })
    if (error) throw new Error(`Upload failed: ${error.message}`)

    // Get public URL
    const { data: urlData } = storage.from('logos').getPublicUrl(path)
    const logoUrl = urlData.publicUrl

    // Save URL to exploitant
    await db.exploitant.update({
      where: { id: ctx.exploitantId },
      data: { logoUrl },
    })

    return { success: true, logoUrl }
  })
}
```

NOTE: This requires two new env vars:

- `NEXT_PUBLIC_SUPABASE_URL` — the Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — the service role key (server-side only, never exposed to client)

Add these to `.env.example` and Vercel env vars.

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add lib/actions/exploitant.ts package.json pnpm-lock.yaml .env.example
git commit -m "feat(actions): exploitant update + logo upload with sharp resize"
```

---

# Phase D — Sidebar + settings

---

## Task 10: shadcn Sidebar + app layout

**Files:**

- Create: `components/ui/sidebar.tsx` (via shadcn CLI)
- Create: `components/app-sidebar.tsx`
- Modify: `app/[locale]/(app)/layout.tsx`

- [ ] **Step 1: Initialize shadcn if not already done**

```bash
pnpm dlx shadcn@latest init
```

Follow prompts: style = default, base color = slate, CSS variables = yes.

- [ ] **Step 2: Add sidebar component**

```bash
pnpm dlx shadcn@latest add sidebar
```

This generates `components/ui/sidebar.tsx` and may add other UI primitives it depends on.

- [ ] **Step 3: Add other shadcn components needed for P1**

```bash
pnpm dlx shadcn@latest add button card badge table input label toast form separator
```

- [ ] **Step 4: Create components/app-sidebar.tsx**

A server component that renders the navigation sidebar:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar'

const navItems = [
  { key: 'home', href: '', icon: 'Home' },
  { key: 'ballons', href: '/ballons', icon: 'Circle' },
  { key: 'pilotes', href: '/pilotes', icon: 'Users' },
  { key: 'settings', href: '/settings', icon: 'Settings' },
] as const

export function AppSidebar() {
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations('nav')

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-4 py-2 text-lg font-semibold">Calpax</div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const fullHref = `/${locale}${item.href}`
                const isActive =
                  pathname === fullHref || (item.href !== '' && pathname.startsWith(fullHref))
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={fullHref}>{t(item.key)}</Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
```

- [ ] **Step 5: Update app layout to include Sidebar + SidebarProvider**

Modify `app/[locale]/(app)/layout.tsx` to wrap content in `SidebarProvider` + `AppSidebar`:

```tsx
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) {
    redirect('/fr/auth/signin')
  }
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
```

- [ ] **Step 6: Add nav i18n messages**

In `messages/fr.json`, add:

```json
"nav": {
  "home": "Accueil",
  "ballons": "Ballons",
  "pilotes": "Pilotes",
  "settings": "Parametres"
}
```

In `messages/en.json`, add:

```json
"nav": {
  "home": "Home",
  "ballons": "Balloons",
  "pilotes": "Pilots",
  "settings": "Settings"
}
```

- [ ] **Step 7: Verify dev server**

```bash
pnpm dev
```

Navigate to `localhost:3000/fr` — expect sidebar visible with 4 nav links.

- [ ] **Step 8: Commit**

```bash
git add components/ app/[locale]/(app)/layout.tsx messages/ lib/ package.json pnpm-lock.yaml
git commit -m "feat(ui): shadcn sidebar navigation with i18n"
```

---

## Task 11: Exploitant settings page

**Files:**

- Create: `app/[locale]/(app)/settings/page.tsx`
- Create: `components/logo-upload.tsx`

- [ ] **Step 1: Create the settings page**

`app/[locale]/(app)/settings/page.tsx` — a server component that loads the current exploitant, renders a form pre-filled with all fields, and a logo upload dropzone. Uses server actions from `lib/actions/exploitant.ts`.

The form uses `react-hook-form` + zod resolver + `exploitantSchema`. Fields: name, frDecNumber (read-only), SIRET, numCamo, adresse, codePostal, ville, pays, telephone, email, website, contactName. Plus a separate logo upload section.

- [ ] **Step 2: Create components/logo-upload.tsx**

A client component with a file input, preview of the current logo, and an upload button that calls the `uploadLogo` server action.

- [ ] **Step 3: Verify in browser**

Navigate to `/fr/settings` — expect the form with pre-filled Cameron Balloons data and a logo upload area.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/(app)/settings/ components/logo-upload.tsx
git commit -m "feat(ui): exploitant settings page with logo upload"
```

---

# Phase E — Ballons CRUD

---

## Task 12: Ballon server actions

**Files:**

- Create: `lib/actions/ballon.ts`

- [ ] **Step 1: Write server actions**

```ts
'use server'

import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/requireAuth'
import { ballonSchema } from '@/lib/schemas/ballon'
import { redirect } from 'next/navigation'

export async function createBallon(formData: FormData) {
  return requireAuth(async () => {
    const raw = Object.fromEntries(formData.entries())
    // Parse performanceChart from individual form fields
    const chart: Record<string, number> = {}
    for (let t = 10; t <= 34; t++) {
      const val = formData.get(`chart_${t}`)
      if (val && String(val).trim() !== '') {
        chart[String(t)] = Number(val)
      }
    }
    const data = ballonSchema.parse({ ...raw, performanceChart: chart })

    const ballon = await db.ballon.create({ data })
    redirect(`../ballons/${ballon.id}`)
  })
}

export async function updateBallon(id: string, formData: FormData) {
  return requireAuth(async () => {
    const raw = Object.fromEntries(formData.entries())
    const chart: Record<string, number> = {}
    for (let t = 10; t <= 34; t++) {
      const val = formData.get(`chart_${t}`)
      if (val && String(val).trim() !== '') {
        chart[String(t)] = Number(val)
      }
    }
    const data = ballonSchema.parse({ ...raw, performanceChart: chart })

    await db.ballon.update({ where: { id }, data })
    redirect(`../ballons/${id}`)
  })
}

export async function toggleBallonActif(id: string, actif: boolean) {
  return requireAuth(async () => {
    await db.ballon.update({ where: { id }, data: { actif } })
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/actions/ballon.ts
git commit -m "feat(actions): ballon create/update/toggle server actions"
```

---

## Task 13: Ballons list + create + edit + detail pages

**Files:**

- Create: `app/[locale]/(app)/ballons/page.tsx` — list
- Create: `app/[locale]/(app)/ballons/new/page.tsx` — create form
- Create: `app/[locale]/(app)/ballons/[id]/page.tsx` — detail
- Create: `app/[locale]/(app)/ballons/[id]/edit/page.tsx` — edit form
- Create: `components/performance-chart-input.tsx` — 25-row editor
- Create: `components/performance-chart-display.tsx` — read-only table
- Create: `components/expiry-badge.tsx` — severity badge

- [ ] **Step 1: Create expiry badge component**

`components/expiry-badge.tsx` — takes an expiry date, calls `computeAlertSeverity()`, renders a colored badge (green OK, yellow WARNING, orange CRITICAL, red EXPIRED).

- [ ] **Step 2: Create performance chart input component**

`components/performance-chart-input.tsx` — a client component that renders a 25-row table (10°C to 34°C), each row with a temperature label and a numeric input for max payload. Takes `defaultValues?: Record<string, number>` prop for edit mode.

- [ ] **Step 3: Create performance chart display component**

`components/performance-chart-display.tsx` — read-only version, renders the chart as a styled table with temperature headers and payload values.

- [ ] **Step 4: Create ballons list page**

`app/[locale]/(app)/ballons/page.tsx` — server component, queries `db.ballon.findMany()`, renders a table with name, immat, volume, passengers, CAMO badge, actif toggle. "Ajouter un ballon" button links to `/ballons/new`.

- [ ] **Step 5: Create ballon create page**

`app/[locale]/(app)/ballons/new/page.tsx` — form with all fields + performance chart input. Submits to `createBallon` server action.

- [ ] **Step 6: Create ballon detail page**

`app/[locale]/(app)/ballons/[id]/page.tsx` — server component, loads ballon by id, displays all fields + performance chart display + CAMO badge. "Modifier" link to edit page.

- [ ] **Step 7: Create ballon edit page**

`app/[locale]/(app)/ballons/[id]/edit/page.tsx` — pre-filled form, submits to `updateBallon` server action.

- [ ] **Step 8: Add i18n messages for ballons**

Add ballon-related messages to `messages/fr.json` and `messages/en.json` (page titles, form labels, table headers, button labels).

- [ ] **Step 9: Verify in browser**

Navigate to `/fr/ballons` — expect 9 seeded ballons in the table. Click one to see detail. Click "Modifier" to edit. Click "Ajouter" to create new.

- [ ] **Step 10: Commit**

```bash
git add app/[locale]/(app)/ballons/ components/ messages/
git commit -m "feat(ui): ballons crud — list, create, edit, detail with performance chart"
```

---

# Phase F — Pilotes CRUD

---

## Task 14: Pilote server actions

**Files:**

- Create: `lib/actions/pilote.ts`

- [ ] **Step 1: Write server actions**

```ts
'use server'

import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/requireAuth'
import { piloteSchema } from '@/lib/schemas/pilote'
import { encrypt, decrypt } from '@/lib/crypto'
import { redirect } from 'next/navigation'

export async function createPilote(formData: FormData) {
  return requireAuth(async () => {
    const raw = Object.fromEntries(formData.entries())
    const classes = formData.getAll('classesBallon').map(String)
    const parsed = piloteSchema.parse({ ...raw, classesBallon: classes })

    const { poids, ...rest } = parsed
    const data = {
      ...rest,
      poidsEncrypted: poids ? encrypt(poids.toString()) : null,
    }

    const pilote = await db.pilote.create({ data })
    redirect(`../pilotes/${pilote.id}`)
  })
}

export async function updatePilote(id: string, formData: FormData) {
  return requireAuth(async () => {
    const raw = Object.fromEntries(formData.entries())
    const classes = formData.getAll('classesBallon').map(String)
    const parsed = piloteSchema.parse({ ...raw, classesBallon: classes })

    const { poids, ...rest } = parsed
    const data = {
      ...rest,
      poidsEncrypted: poids ? encrypt(poids.toString()) : null,
    }

    await db.pilote.update({ where: { id }, data })
    redirect(`../pilotes/${id}`)
  })
}

export async function togglePiloteActif(id: string, actif: boolean) {
  return requireAuth(async () => {
    await db.pilote.update({ where: { id }, data: { actif } })
  })
}

/** Decrypt poids for display. Call from server components only. */
export function decryptPoids(encrypted: string | null): number | null {
  if (!encrypted) return null
  return Number(decrypt(encrypted))
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/actions/pilote.ts
git commit -m "feat(actions): pilote create/update/toggle with encrypted poids"
```

---

## Task 15: Pilotes list + create + edit + detail pages

**Files:**

- Create: `app/[locale]/(app)/pilotes/page.tsx` — list
- Create: `app/[locale]/(app)/pilotes/new/page.tsx` — create
- Create: `app/[locale]/(app)/pilotes/[id]/page.tsx` — detail
- Create: `app/[locale]/(app)/pilotes/[id]/edit/page.tsx` — edit

- [ ] **Step 1: Create pilotes list page**

Similar to ballons list. Table with nom, prenom, licence, expiry badge, qualification flag, actif toggle.

- [ ] **Step 2: Create pilote create page**

Form with all fields. Poids is a number input. classesBallon as checkboxes or multi-select.

- [ ] **Step 3: Create pilote detail page**

Shows all fields. Poids decrypted via `decryptPoids()`. Expiry badge for licence.

- [ ] **Step 4: Create pilote edit page**

Pre-filled form. Poids decrypted for display, re-encrypted on save.

- [ ] **Step 5: Add i18n messages for pilotes**

Add pilote-related messages to both locale files.

- [ ] **Step 6: Verify in browser**

Navigate to `/fr/pilotes` — expect 4 seeded pilots. Click one to see detail with decrypted weight.

- [ ] **Step 7: Commit**

```bash
git add app/[locale]/(app)/pilotes/ messages/
git commit -m "feat(ui): pilotes crud — list, create, edit, detail with encrypted poids"
```

---

# Phase G — Alerts + cron

---

## Task 16: Alerts banner component

**Files:**

- Create: `components/alerts-banner.tsx`
- Modify: `app/[locale]/(app)/layout.tsx` — add AlertsBanner

- [ ] **Step 1: Create components/alerts-banner.tsx**

A server component that:

1. Calls `requireAuth()` to get the context
2. Queries `db.ballon.findMany()` and `db.pilote.findMany()` for the current tenant
3. Calls `buildBallonAlerts()` and `buildPiloteAlerts()` from `lib/regulatory/alerts.ts`
4. Calls `sortAlerts()` to order by severity
5. Renders nothing if no alerts
6. Renders colored alert banners for each alert (EXPIRED=red, CRITICAL=orange, WARNING=yellow)

- [ ] **Step 2: Add AlertsBanner to app layout**

In `app/[locale]/(app)/layout.tsx`, render `<AlertsBanner />` above the page content (inside `SidebarInset`, before `{children}`).

- [ ] **Step 3: Verify in browser**

Navigate to `/fr` — expect alert banners for the seeded ballons/pilotes with near-expiry dates.

- [ ] **Step 4: Commit**

```bash
git add components/alerts-banner.tsx app/[locale]/(app)/layout.tsx
git commit -m "feat(ui): alerts banner for CAMO and BFCL expirations"
```

---

## Task 17: Vercel Cron weekly digest

**Files:**

- Create: `app/api/cron/digest/route.ts`
- Create: `vercel.json`
- Create: `lib/email/digest.ts` — email template

- [ ] **Step 1: Write the cron endpoint**

`app/api/cron/digest/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { basePrisma } from '@/lib/db/base'
import { buildBallonAlerts, buildPiloteAlerts, sortAlerts } from '@/lib/regulatory/alerts'
import { sendDigestEmail } from '@/lib/email/digest'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const exploitants = await basePrisma.exploitant.findMany({
    where: { frDecNumber: { not: 'INTERNAL.CALPAX' } },
    include: {
      ballons: {
        where: { actif: true },
        select: { id: true, immatriculation: true, camoExpiryDate: true, actif: true },
      },
      pilotes: {
        where: { actif: true },
        select: { id: true, prenom: true, nom: true, dateExpirationLicence: true, actif: true },
      },
      users: { where: { role: 'GERANT' }, select: { email: true } },
    },
  })

  let sent = 0
  let skipped = 0

  for (const exp of exploitants) {
    const alerts = sortAlerts([
      ...buildBallonAlerts(exp.ballons),
      ...buildPiloteAlerts(exp.pilotes),
    ])

    if (alerts.length === 0) {
      skipped++
      continue
    }

    const emails = exp.users.map((u) => u.email).filter(Boolean)
    if (emails.length === 0) {
      skipped++
      continue
    }

    await sendDigestEmail(emails, exp.name, alerts)
    sent++
  }

  logger.info({ sent, skipped }, 'Weekly digest completed')
  return NextResponse.json({ sent, skipped })
}
```

- [ ] **Step 2: Write lib/email/digest.ts**

```ts
import { Resend } from 'resend'
import type { Alert } from '@/lib/regulatory/alerts'

const resend = new Resend(process.env.RESEND_API_KEY)

function severityColor(severity: string): string {
  switch (severity) {
    case 'EXPIRED':
      return '#dc2626'
    case 'CRITICAL':
      return '#ea580c'
    case 'WARNING':
      return '#ca8a04'
    default:
      return '#16a34a'
  }
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export async function sendDigestEmail(to: string[], exploitantName: string, alerts: Alert[]) {
  const rows = alerts
    .map(
      (a) =>
        `<tr>
          <td style="padding:8px;border:1px solid #e5e7eb">${a.entityName}</td>
          <td style="padding:8px;border:1px solid #e5e7eb">${a.alertType === 'CAMO_EXPIRY' ? 'CAMO' : 'BFCL'}</td>
          <td style="padding:8px;border:1px solid #e5e7eb">${formatDate(a.expiryDate)}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;color:${severityColor(a.severity)};font-weight:bold">${a.daysRemaining > 0 ? `${a.daysRemaining}j` : 'EXPIRE'}</td>
        </tr>`,
    )
    .join('')

  const html = `
    <h2>Alertes navigabilite — ${exploitantName}</h2>
    <p>${alerts.length} alerte(s) dans les 90 prochains jours.</p>
    <table style="border-collapse:collapse;width:100%">
      <thead>
        <tr style="background:#f3f4f6">
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Entite</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Type</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Echeance</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Delai</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:16px;color:#6b7280;font-size:12px">Email envoye automatiquement par Calpax.</p>
  `

  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'no-reply@calpax.fr',
    to,
    subject: `[Calpax] ${alerts.length} alertes navigabilite — semaine du ${today}`,
    html,
  })
}
```

- [ ] **Step 3: Create vercel.json**

```json
{
  "crons": [
    {
      "path": "/api/cron/digest",
      "schedule": "0 7 * * 1"
    }
  ]
}
```

- [ ] **Step 4: Add CRON_SECRET to env**

Generate a secret and add `CRON_SECRET` to `.env` and Vercel env vars.

- [ ] **Step 5: Test manually**

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/digest
```

Expected: JSON response `{ "sent": 1, "skipped": 0 }` and email in Resend dashboard.

- [ ] **Step 6: Commit**

```bash
git add app/api/cron/ lib/email/ vercel.json .env.example
git commit -m "feat(cron): weekly email digest for CAMO and BFCL alerts"
```

---

# Phase H — Tests + deploy

---

## Task 18: Full test pass + i18n completion

**Files:**

- Modify: `messages/fr.json`, `messages/en.json` (complete all P1 keys)

- [ ] **Step 1: Run all tests**

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
```

Fix any failures.

- [ ] **Step 2: Complete i18n messages**

Ensure all P1 pages have their translation keys in both fr.json and en.json: ballons (list, create, edit, detail), pilotes (same), settings, alerts, nav.

- [ ] **Step 3: Verify P0 tests still pass**

All 28 P0 tests must still pass. No regressions.

- [ ] **Step 4: Commit**

```bash
git add messages/ tests/
git commit -m "test: complete p1 test suite + i18n messages"
```

---

## Task 19: Apply migration to prod + deploy + verify

**Files:** none (manual steps)

- [ ] **Step 1: Apply P1 migration to prod Supabase**

```bash
DATABASE_URL="<prod-url>?sslmode=require" pnpm exec prisma migrate deploy
```

- [ ] **Step 2: Add SUPABASE_CA_CERT to Vercel (if TD-001 fixed)**

Or keep `NODE_TLS_REJECT_UNAUTHORIZED=0` if the CA cert approach doesn't work.

- [ ] **Step 3: Add new env vars to Vercel**

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — service role key
- `CRON_SECRET` — generated secret for cron auth

- [ ] **Step 4: Create logos bucket in prod Supabase**

Via Supabase Dashboard > Storage > Create Bucket: `logos`, public, 2 MB limit.

- [ ] **Step 5: Seed prod with P1 data**

```bash
DATABASE_URL="<prod-url>?sslmode=require" pnpm exec prisma db seed
```

- [ ] **Step 6: Push and verify**

```bash
git push origin main
```

After Vercel deploys:

- `/fr/ballons` — 9 ballons visible
- `/fr/pilotes` — 4 pilotes visible
- `/fr/settings` — exploitant details shown
- Dashboard alerts visible for near-expiry entities
- Sidebar navigation working

- [ ] **Step 7: Test cron manually on prod**

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://calpax.fr/api/cron/digest
```

Verify email arrives in the exploitant's inbox.

---

## Task 20: P1 exit criteria verification

Walk through the spec's section 1 checklist:

- [ ] TD-001 resolved (or documented workaround remains)
- [ ] Exploitant settings with logo upload working
- [ ] 9 ballons seeded with performance charts
- [ ] Ballon CRUD functional
- [ ] 4 pilotes seeded
- [ ] Pilote CRUD functional with encrypted poids
- [ ] Dashboard alerts visible
- [ ] Weekly email digest tested
- [ ] Blocking helpers unit-tested
- [ ] Tenant isolation tests for Ballon + Pilote
- [ ] Sidebar navigation functional
- [ ] All tests pass (P0 + P1)
- [ ] Deployed on calpax.fr

- [ ] **Update roadmap spec with P1 completion date**

- [ ] **Update Obsidian session notes**

- [ ] **Announce P1 done**

P1 is complete. Next phase: brainstorm P2 (Back-office flight lifecycle — Billet, Vol, organisation, fiche de vol PDF, devis de masse).
