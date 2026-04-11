# P1 — Regulatory back-office (design spec)

**Date:** 2026-04-11
**Phase:** P1 of the Calpax v2 roadmap (see `2026-04-09-calpax-roadmap-decomposition.md`)
**Goal:** deliver the non-negotiable regulatory entities (Exploitant profile, Ballon with performance chart, Pilote with BFCL licence) and the alert system that keeps an operator aware of upcoming certificate expirations. Also fix TD-001 (TLS workaround) and establish RGPD technical foundations.
**Status:** design agreed during brainstorming session on 2026-04-11. Next step: `writing-plans` to produce an executable implementation plan.

---

## 1. Success criteria (P1 done)

- [ ] TD-001 resolved: `NODE_TLS_REJECT_UNAUTHORIZED` removed from Vercel, proper Supabase CA cert in use
- [ ] Exploitant settings page: all fields editable, logo upload with sharp resize (max 400px, PNG output), logo displayed in UI
- [ ] 7 Cameron Balloons ballons seeded with full performance charts from v1
- [ ] Ballon CRUD: list, create, edit, detail pages. Performance chart input (25-row table) and display functional.
- [ ] 3-4 pilotes seeded from v1's `personne` table
- [ ] Pilote CRUD: list, create, edit, detail pages. Poids encrypted in DB (verified: column value is base64 ciphertext, not a number)
- [ ] Dashboard alerts: banners visible for upcoming CAMO/BFCL expirations, color-coded by severity
- [ ] Weekly email digest: Vercel Cron endpoint tested via manual `curl`, email received in Resend dashboard
- [ ] Blocking helpers: `isBallonFlightReady()` and `isPiloteAssignable()` unit-tested with expired/valid/missing scenarios
- [ ] `TENANT_FILTER` updated: Ballon and Pilote tenant-isolated (integration test: exploitant A can't see B's ballons/pilotes)
- [ ] Sidebar navigation with shadcn Sidebar component (Accueil, Ballons, Pilotes, Parametres)
- [ ] All P0 tests still pass (28 tests) + P1 tests (target: 15+ new covering CRUD, alerts, validation, crypto, tenant isolation)
- [ ] Deployed and verified on `calpax.fr`

---

## 2. Scope decisions from brainstorming

| Decision           | Choice                                       | Rationale                                                                                                      |
| ------------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Alert delivery     | Dashboard banners + weekly email digest      | Dashboard for daily use, email for operators who don't log in every day. Individual threshold emails deferred. |
| RGPD droits UI     | Technical plumbing only, no UI               | No passenger data exists in P1. Droits interface deferred to P2 when passengers are created.                   |
| Exploitant profile | Full profile with logo upload + sharp resize | All text fields + logo. Logo resized server-side to max 400px PNG.                                             |
| Navigation         | Sidebar now (shadcn)                         | Not deferred to P3. Functional sidebar from P1.                                                                |
| Pilote seed        | 3-4 pilots from v1                           | More realistic testing than 1 pilot.                                                                           |

---

## 3. Schema changes

### 3.1 Exploitant (extend existing model)

New fields added via Prisma migration:

```prisma
model Exploitant {
  // existing (P0)
  id          String   @id @default(cuid())
  name        String
  frDecNumber String   @unique
  users       User[]

  // P1 additions
  siret       String?
  numCamo     String?              // N CAMO organisation (e.g. "OSAC")
  adresse     String?
  codePostal  String?
  ville       String?
  pays        String   @default("France")
  telephone   String?
  email       String?
  website     String?
  contactName String?              // main contact person
  logoUrl     String?              // Supabase Storage public URL

  ballons     Ballon[]
  pilotes     Pilote[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("exploitant")
}
```

### 3.2 Ballon (new model)

```prisma
model Ballon {
  id                     String    @id @default(cuid())
  exploitantId           String
  exploitant             Exploitant @relation(fields: [exploitantId], references: [id], onDelete: Cascade)

  nom                    String              // display name, e.g. "Le Grand Bleu"
  immatriculation        String              // e.g. "F-HFCC"
  volume                 String              // e.g. "Z-105 (3000 m3)"
  nbPassagerMax          Int                 // homologated max passengers
  peseeAVide             Int                 // empty weight in kg (enveloppe + nacelle + equipement)
  configGaz              String              // e.g. "4xCB2990 : 4x23 kg"
  manexAnnexRef          String              // e.g. "Manex - Annexe 5.4"
  mtom                   Int?                // Max Take-Off Mass (kg)
  mlm                    Int?                // Max Landing Mass (kg)

  // Temperature-dependent max payload: { "10": 482, "11": 470, ..., "34": 214 }
  // Keys are temperature in Celsius (string), values are max payload in kg.
  // Extracted from the balloon's Manex annex.
  performanceChart       Json

  // CAMO / navigability
  camoOrganisme          String?             // e.g. "OSAC"
  camoExpiryDate         DateTime?           // ARC (Airworthiness Review Certificate) expiry
  certificatNavigabilite String?             // Part-21 cert reference

  actif                  Boolean  @default(true)  // soft-disable, not delete (regulatory history)
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  @@unique([exploitantId, immatriculation])
  @@index([exploitantId])
  @@map("ballon")
}
```

**Design notes:**

- `performanceChart` as `Json` — flat `Record<string, number>`. Validated at input via zod, not at Prisma level. Simpler than a normalized table; balloon performance charts don't change independently of the balloon.
- `@@unique([exploitantId, immatriculation])` — same immat can't exist twice per exploitant.
- `actif` for soft-disable — can't delete a balloon that has historical flights (P2+).
- `onDelete: Cascade` from Exploitant — RGPD right to erasure.

### 3.3 Pilote (new model)

```prisma
model Pilote {
  id                       String    @id @default(cuid())
  exploitantId             String
  exploitant               Exploitant @relation(fields: [exploitantId], references: [id], onDelete: Cascade)
  userId                   String?   @unique  // optional link to User (for M3 mobile login)

  prenom                   String
  nom                      String
  email                    String?
  telephone                String?
  poidsEncrypted           String?            // AES-256-GCM via lib/crypto (for devis de masse in P2)

  // BFCL licence
  licenceBfcl              String             // licence number
  qualificationCommerciale Boolean @default(false)  // vol commercial passagers
  dateExpirationLicence    DateTime
  classesBallon            String[]           // balloon classes qualified for (per BFCL regulation)
  heuresDeVol              Int?               // total flight hours (informational)

  actif                    Boolean  @default(true)
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  @@index([exploitantId])
  @@map("pilote")
}
```

**Design notes:**

- `poidsEncrypted` — stored as base64 ciphertext via `lib/crypto.encrypt(poids.toString())`. First real use of the P0 crypto lib. Decrypted in the service layer for devis de masse (P2). The UI shows a normal number input; encryption is transparent.
- `userId` optional — pilots don't need logins in P1. M3 adds mobile view via a linked User with role `PILOTE`.
- `classesBallon` as `String[]` (Postgres native array) — classes per BFCL regulation.
- `onDelete: Cascade` from Exploitant — same RGPD reasoning.

### 3.4 TENANT_FILTER update

In `lib/db/tenant-extension.ts`, add both new models:

```ts
export const TENANT_FILTER: Record<string, string> = {
  Exploitant: 'id',
  User: 'exploitantId',
  AuditLog: 'exploitantId',
  Ballon: 'exploitantId',
  Pilote: 'exploitantId',
}
```

---

## 4. Alert system

### 4.1 Computed alerts (no separate table)

Alerts are computed on-the-fly from expiry dates. No `Alert` table — avoids stale data.

```ts
// lib/regulatory/alerts.ts

type AlertSeverity = 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'OK'

type Alert = {
  severity: AlertSeverity
  entityType: 'BALLON' | 'PILOTE'
  entityId: string
  entityName: string // "F-HFCC" or "Olivier Cuenot"
  alertType: 'CAMO_EXPIRY' | 'BFCL_EXPIRY'
  expiryDate: Date
  daysRemaining: number // negative if expired
}

// Thresholds:
// Ballon CAMO: WARNING 31-60 days, CRITICAL 1-30 days, EXPIRED <= 0
// Pilote BFCL: WARNING 31-90 days, CRITICAL 1-30 days, EXPIRED <= 0

function getAlertsForExploitant(exploitantId: string): Promise<Alert[]>
// Queries all active ballons + pilotes for the tenant.
// Returns sorted: EXPIRED first, then CRITICAL, then WARNING.
// Entities with actif = false are excluded.
```

### 4.2 Blocking helpers (`lib/regulatory/validation.ts`)

Pure functions, no DB calls. The caller fetches the entity, then validates.

```ts
type ValidationResult = { valid: true } | { valid: false; reason: string }

function isBallonFlightReady(ballon: Ballon): ValidationResult
// Checks: actif === true, camoExpiryDate exists and > today

function isPiloteAssignable(pilote: Pilote, requiredBallonClass?: string): ValidationResult
// Checks: actif === true, dateExpirationLicence > today,
//         qualificationCommerciale === true,
//         requiredBallonClass in classesBallon (if provided)
```

P1 delivers these with unit tests. P2 calls them at vol creation to enforce hard blocks.

### 4.3 Dashboard alerts banner

Server component `<AlertsBanner />` rendered in `app/[locale]/(app)/layout.tsx`:

- Calls `getAlertsForExploitant()` inside `requireAuth()` context
- Renders nothing if no alerts
- Renders color-coded banners by severity:
  - EXPIRED: red background — "F-HFCC — CAMO expire depuis 12 jours"
  - CRITICAL: orange background — "Licence BFCL O. Cuenot expire dans 15 jours"
  - WARNING: yellow background — "CAMO F-HTLT expire dans 45 jours"
- Visible on every back-office page (in the layout, above page content)

### 4.4 Weekly email digest (Vercel Cron)

- **Trigger:** Vercel Cron, every Monday at 07:00 UTC
- **Endpoint:** `app/api/cron/digest/route.ts`
- **Auth:** `CRON_SECRET` env var (Vercel sends it in the `Authorization` header)
- **Logic:**
  1. Query each exploitant's ballons + pilotes with expirations within 90 days
  2. Skip exploitants with zero alerts
  3. Send one email per exploitant via Resend
  4. Subject: `[Calpax] {n} alertes navigabilite — semaine du {date}`
  5. Body: HTML table with entity name, type (CAMO/BFCL), expiry date, days remaining, severity indicator
- **Logging:** log sent/skipped counts via `logger`

`vercel.json` cron config:

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

---

## 5. Supabase Storage for logo

- Create a `logos` bucket in Supabase Storage (public read, authenticated write)
- Server action flow:
  1. Validate: PNG/JPG/SVG, max 2 MB raw
  2. Resize via `sharp`: max 400px wide, maintain aspect ratio, output PNG (quality 85)
  3. Upload to `logos/{exploitantId}/logo.png` (overwrite on re-upload)
  4. Save public URL to `Exploitant.logoUrl`
- `sharp` is bundled with Next.js on Vercel — no extra dependency

---

## 6. RGPD technical foundations (no droits UI)

- `Pilote.poidsEncrypted` — first real encrypted field using `lib/crypto` from P0.
  - On write: `encrypt(poids.toString())` → store ciphertext
  - On read: `decrypt(ciphertext)` → parse back to number
  - Service-layer helpers: `encryptPoids(kg: number): string` and `decryptPoids(encrypted: string): number`
- Convention established: any field storing personal data uses the `*Encrypted` suffix and the same encrypt/decrypt pattern.
- Delete cascade: `onDelete: Cascade` on Exploitant → Ballon, Pilote ensures tenant deletion wipes all data (RGPD art. 17 right to erasure).

---

## 7. UI structure

### 7.1 Sidebar navigation (shadcn)

Add `@shadcn/ui` Sidebar component to `app/[locale]/(app)/layout.tsx`. Links:

| Label (FR) | Label (EN) | Route       | Icon     |
| ---------- | ---------- | ----------- | -------- |
| Accueil    | Home       | `/`         | Home     |
| Ballons    | Balloons   | `/ballons`  | —        |
| Pilotes    | Pilots     | `/pilotes`  | —        |
| Parametres | Settings   | `/settings` | Settings |

Sidebar is collapsible on mobile. Active link highlighted.

### 7.2 Pages

**Exploitant settings** (`app/[locale]/(app)/settings/page.tsx`)

- Form with all Exploitant fields (SIRET, CAMO, adresse, contact, etc.)
- Logo upload dropzone with preview
- Server action to save profile + upload logo
- Success toast on save

**Ballons list** (`app/[locale]/(app)/ballons/page.tsx`)

- Table: nom, immatriculation, volume, nbPassagerMax, CAMO expiry badge (green/orange/red), actif toggle
- "Ajouter un ballon" button

**Ballon create/edit** (`app/[locale]/(app)/ballons/[id]/page.tsx`)

- Form: all fields
- Performance chart editor: 25-row table (10°C to 34°C), each row has a numeric input for max payload (kg)
- For create: chart rows start empty. For edit: pre-filled from existing `performanceChart` JSON.

**Ballon detail** (`app/[locale]/(app)/ballons/[id]/detail/page.tsx`)

- Read-only view with all fields
- Performance chart rendered as a styled table
- CAMO status badge with days remaining

**Pilotes list** (`app/[locale]/(app)/pilotes/page.tsx`)

- Table: nom, prenom, licence BFCL, expiry badge (green/orange/red), qualification commerciale flag, actif toggle

**Pilote create/edit** (`app/[locale]/(app)/pilotes/[id]/page.tsx`)

- Form: all fields. Poids is a regular number input — encrypted transparently.

**Pilote detail** (`app/[locale]/(app)/pilotes/[id]/detail/page.tsx`)

- Read-only view with licence info, classes, hours, poids (decrypted)

### 7.3 Form validation (zod)

Shared zod schemas in `lib/schemas/`:

```ts
// lib/schemas/ballon.ts
const performanceChartSchema = z.record(
  z.string().regex(/^\d{1,2}$/), // temperature key: "10" to "34"
  z.number().positive(), // max payload in kg
)

const ballonSchema = z.object({
  nom: z.string().min(1),
  immatriculation: z.string().min(1).max(15),
  volume: z.string().min(1),
  nbPassagerMax: z.number().int().positive(),
  peseeAVide: z.number().int().positive(),
  configGaz: z.string().min(1),
  manexAnnexRef: z.string().min(1),
  mtom: z.number().int().positive().optional(),
  mlm: z.number().int().positive().optional(),
  performanceChart: performanceChartSchema,
  camoOrganisme: z.string().optional(),
  camoExpiryDate: z.date().optional(),
  certificatNavigabilite: z.string().optional(),
})

// lib/schemas/pilote.ts
const piloteSchema = z.object({
  prenom: z.string().min(1),
  nom: z.string().min(1),
  email: z.string().email().optional(),
  telephone: z.string().optional(),
  poids: z.number().positive().optional(), // plain number in form, encrypted on save
  licenceBfcl: z.string().min(1),
  qualificationCommerciale: z.boolean(),
  dateExpirationLicence: z.date(),
  classesBallon: z.array(z.string()).min(1),
  heuresDeVol: z.number().int().nonnegative().optional(),
})
```

---

## 8. Seed data

### 8.1 Ballons (7 from v1)

Cameron Balloons France ballons with full performance charts extracted from `v1-reference/create-ficheVol-pdf.php` lines 47-622:

| Immat  | Volume          | Pesee (kg) | MTOM (kg) | MLM (kg) | Manex |
| ------ | --------------- | ---------- | --------- | -------- | ----- |
| F-HFCC | Z-105 (3000 m3) | 376        | —         | —        | 5.4   |
| F-HTLT | Z-133 (3700 m3) | 485        | 1206      | 603      | 5.6   |
| F-HMJD | Z-133 (3700 m3) | 492        | 1206      | 603      | 5.6   |
| F-HCPJ | Z-90 (2600 m3)  | 343        | 816       | 0        | 5.2   |
| F-GVGD | Z-120 (3400 m3) | 467        | 1088      | 544      | 5.5   |
| F-HACK | Z-225 (6400 m3) | 746        | 2041      | 1021     | 5.7   |
| F-HPLM | Z-105 (3000 m3) | 378        | 952       | 476      | 5.3   |

Each with their full `performanceChart` JSON (25 entries, 10°C to 34°C). Charts already extracted during the P0 v1 analysis — values available in the plan.

### 8.2 Pilotes (3-4 from v1)

Extract from `v1-reference/bdd/extract_bdd.sql` `personne` table where `pilote = 1`. Seed with:

- Fictional BFCL licence numbers
- `qualificationCommerciale = true`
- Expiry dates set to provide test alerts: one near-expiry (30 days), one mid-range (60 days), one far (1 year), optionally one expired

### 8.3 Exploitant update

Update the Cameron Balloons France seed to include the new P1 fields:

- SIRET (from v1 or a placeholder)
- N CAMO: "OSAC" (typical for French balloon operators)
- Adresse: Dole, Jura (from CLAUDE.md)
- CAMO expiry date on each seeded ballon (varied for alert testing)

---

## 9. TD-001 fix (TLS workaround)

First task of P1. Replace `NODE_TLS_REJECT_UNAUTHORIZED=0` with proper SSL handling:

1. Download Supabase CA certificate from dashboard (Settings > Database > SSL > Download Certificate)
2. Store as `certs/supabase-ca.crt` (gitignored) or embed via env var `SUPABASE_CA_CERT`
3. Update `lib/db/base.ts` Pool config:
   ```ts
   ssl: isRemote ? { ca: process.env.SUPABASE_CA_CERT, rejectUnauthorized: true } : false
   ```
4. Add `SUPABASE_CA_CERT` env var to Vercel (paste the cert content)
5. Remove `NODE_TLS_REJECT_UNAUTHORIZED` from Vercel env vars
6. Verify the app still connects to Supabase
7. Remove TD-001 from `docs/TECH_DEBT.md` (or mark resolved)

---

## 10. Explicitly NOT in P1

- Vol, Billet, Passager, Paiement entities (P2)
- Fiche de vol PDF generation (P2)
- Devis de masse calculation (P2 — uses the performance chart data from P1)
- Public booking page (P3)
- RGPD droits interface (P2 when passengers exist)
- DPA e-sign flow (P-SaaS)
- Pilote mobile view / login (M3)
- Weather (Pw)
- GPS tracking (M5)

---

## 11. Dependencies on P0

P1 builds directly on:

- `lib/db/tenant-extension.ts` — extend `TENANT_FILTER` with Ballon + Pilote
- `lib/db/audit-extension.ts` — automatically audits Ballon + Pilote mutations
- `lib/crypto.ts` — used for `Pilote.poidsEncrypted`
- `lib/auth/requireAuth.ts` — wraps all P1 server components
- `lib/context.ts` — provides tenant context for queries
- `prisma/seed.ts` — extended with ballons + pilotes
- `tests/integration/helpers.ts` — `seedTenant()` extended or new helpers for seeding ballons/pilotes in tests

---

## 12. Next step

Run the `writing-plans` skill to produce an executable implementation plan from this spec.
