# P0 — Foundation (design spec)

**Date:** 2026-04-10
**Phase:** P0 of the Calpax v2 roadmap (see `2026-04-09-calpax-roadmap-decomposition.md`)
**Goal:** deliver the multi-tenant, audited, tenant-isolated skeleton everything else in M1 sits on. No product features. The only user-visible artefact is a login flow that proves every layer works end-to-end on real infrastructure.
**Status:** design agreed during brainstorming session on 2026-04-10. Next step: `writing-plans` to produce an executable implementation plan.

---

## 1. Success criteria (the "P0 done" definition)

P0 is complete when an unauthenticated user can:

1. Visit `https://calpax.fr/fr`
2. Get redirected to `/fr/auth/signin`
3. Enter `olivier@cameronfrance.com`
4. Receive a magic link via Resend
5. Click the link
6. Land on `/fr` and see the page render:
   > `Connecté en tant que Olivier Cuenot — Exploitant Cameron Balloons France`

…with all of the following true under the hood:

- The query that loaded `olivier` and `cameronBalloons` went through the **tenant-scoped Prisma client** and was automatically filtered by `exploitantId` via `AsyncLocalStorage`.
- The login event and the session creation wrote audit rows into `audit_log`.
- The whole flow is exercised by a Playwright smoke test running in CI against a real Vercel deployment on `calpax.fr`.
- Damien can sign in as `damien@calpax.fr` (role `ADMIN_CALPAX`) and open `/fr/admin`, which is the only route allowed to import from `lib/admin/**`.
- The same flow works at `/en` (English locale).

**Zero product features.** No ballon, no pilote, no vol, no billet, no PVE, no weather. Those belong in P1 / P2 / Pw.

---

## 2. V1 anchors that shape this phase

- v1 has `billetvol_audit`, `paiement_audit`, `passager_audit` written at the application layer. We generalize this into a single `audit_log` table (Section 4.3).
- v1 is single-tenant. The v2 multi-tenant pattern has no reference to port — designed fresh here (Section 5).
- v1 stores passwords in `personne.password VARCHAR(45)` (almost certainly plaintext or weak hash). v2 uses Auth.js magic links → **no passwords in Calpax ever.** Correct by construction.
- `lib/crypto` in this phase is delivered but not wired into any entity. It becomes load-bearing in P1 (poids passagers) and P3 (passenger contact).

---

## 3. Stack decisions

### 3.1 Locked-in (from `CLAUDE.md` + roadmap + brainstorming)

- Next.js 15 (App Router), TypeScript strict, Tailwind + shadcn/ui, next-intl (FR default + EN)
- Prisma 5.x, Postgres (Supabase), Vercel (hosting), Sentry (errors), Pino (logs)
- Multi-tenancy: Prisma client extension reading tenant from request-scoped `AsyncLocalStorage`
- Audit: Prisma client extension writing to `audit_log`
- Crypto: app-level AES-256-GCM in `lib/crypto`
- Two Prisma clients: `db` (tenant-scoped) + `adminDb` (unscoped, import-restricted via ESLint)
- Impersonation helper for cross-tenant admin actions, fully audited

### 3.2 Tooling defaults

| Concern | Choice |
|---|---|
| Package manager | **pnpm 9+** |
| Node | **Node 22 LTS** on Vercel |
| Auth | **Auth.js v5** (NextAuth v5) with Email provider (magic link via Resend) |
| Email | **Resend**, domain-verified on `calpax.fr` |
| Unit/integration testing | **Vitest** + `@testing-library/react` |
| E2E testing | **Playwright** running against Vercel preview / staging / prod |
| Forms | **react-hook-form + zod** (single source of truth, shared client/server) |
| Schema validation | **zod** |
| Logging | **Pino** (JSON structured) → Sentry for errors |
| Linting | **ESLint flat config + typescript-eslint + prettier**. Custom `no-restricted-imports` rule banning `adminDb` outside `lib/admin/**` + `app/**/admin/**` + `scripts/**`. Custom grep guard banning `$queryRaw*` outside `lib/db/raw/**`. |
| Pre-commit | **Husky + lint-staged**: format + lint + type-check on staged files |
| Commits | Conventional Commits |
| Local DB + auth | **Supabase CLI** (`supabase start` → local Postgres + Studio + auth in Docker) |

### 3.3 Environments

Three environments in P0:

| Env | URL | Supabase project | Purpose |
|---|---|---|---|
| **preview** | Vercel per-PR URL | **reuses `calpax-v2-staging`** | PR validation. Same DB as staging until we upgrade to Supabase Pro and switch to Supabase branching for per-PR ephemeral DBs. |
| **staging** | `https://staging.calpax.fr` | `calpax-v2-staging` (Free tier, region `eu-west-3`) | deployed automatically on every push to `main`. Playwright E2E runs here. |
| **production** | `https://calpax.fr` | `calpax-v2-prod` (Free tier, region `eu-west-3`) | promoted from staging only after E2E green. Same Git SHA, different Vercel deployment target + different Supabase DB. |

**Deploy flow:** PR opened → preview URL + CI jobs run → merge to `main` → Vercel builds and deploys to `staging.calpax.fr` → GitHub Actions runs E2E against staging → on green, promotes to `calpax.fr` production → canary E2E re-runs against prod.

**Upgrade plan:** before M1 dogfood starts, upgrade prod project to Supabase Pro (~25 €/mo) for daily backups, PITR, and no auto-pause. Staging stays on Free. When Pro is live, migrate preview env off shared-staging-DB to Supabase branching so every PR gets its own ephemeral DB.

---

## 4. Data model for P0

**Three business tables + four Auth.js tables. That is all.**

Ballon / Pilote / Vol / Billet / Passager / Paiement are explicitly deferred to P1 and P2. Adding them here would force field decisions we don't yet have enough context to make, and Prisma migrations make later additions cheap.

### 4.1 `Exploitant`

The tenant root. Minimal fields in P0 — P1 fills in siret, numCamo, adresse, logo, plan.

```prisma
model Exploitant {
  id          String   @id @default(cuid())
  name        String                           // "Cameron Balloons France"
  frDecNumber String   @unique                 // "FR.DEC.059"
  users       User[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("exploitant")
}
```

### 4.2 `User` + Auth.js tables

```prisma
model User {
  id             String      @id @default(cuid())
  email          String      @unique
  name           String?
  emailVerified  DateTime?
  image          String?

  // multi-tenant link — every tenanted entity in P1+ has this shape
  exploitantId   String
  exploitant     Exploitant  @relation(fields: [exploitantId], references: [id])

  role           UserRole    @default(GERANT)

  // Auth.js v5 back-references
  accounts       Account[]
  sessions       Session[]

  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  @@index([exploitantId])
  @@map("user")
}

enum UserRole {
  ADMIN_CALPAX      // super-admin across tenants (Damien). Anchored to a "Calpax SAS" Exploitant row.
  GERANT            // exploitant owner
  PILOTE            // pilot; read-only in M3+
  EQUIPIER          // ground crew; M3+
}

// Standard Auth.js v5 tables (from @auth/prisma-adapter)
model Account {
  id                 String   @id @default(cuid())
  userId             String
  type               String
  provider           String
  providerAccountId  String
  refresh_token      String?  @db.Text
  access_token       String?  @db.Text
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String?  @db.Text
  session_state      String?
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("account")
}

model Session {
  id            String   @id @default(cuid())
  sessionToken  String   @unique
  userId        String
  expires       DateTime
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("session")
}

model VerificationToken {
  identifier  String
  token       String   @unique
  expires     DateTime

  @@unique([identifier, token])
  @@map("verification_token")
}
```

**`ADMIN_CALPAX` anchoring decision:** instead of making `exploitantId` nullable for super-admins, we seed a dummy `Exploitant` named `Calpax SAS` (FR.DEC = `INTERNAL.CALPAX`) and attach admin users to it. This keeps the column `NOT NULL`, simplifies every downstream model, and lets super-admins still have a "home tenant" for queries that are *their* data (not a tenant's).

### 4.3 `AuditLog`

Single generic table capturing every mutation through `db` or `adminDb`.

```prisma
model AuditLog {
  id              BigInt      @id @default(autoincrement())

  // tenant the action affected; null for cross-tenant adminDb queries
  exploitantId    String?

  // who did it
  userId          String?                     // real user (null for cron/system)
  impersonatedBy  String?                     // set if ADMIN_CALPAX was acting as a tenant

  entityType      String                      // "User" | "Exploitant" | ...
  entityId        String                      // id of the mutated row
  action          AuditAction

  // for UPDATE: the specific field + before/after. for CREATE/DELETE: null field, row-level before/after.
  field           String?
  beforeValue     Json?
  afterValue      Json?

  createdAt       DateTime    @default(now())

  @@index([exploitantId, entityType, entityId])
  @@index([impersonatedBy])
  @@index([createdAt])
  @@map("audit_log")
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
}
```

**Not audited:** reads. Reads don't mutate state and auditing them would 10× the log volume.

**Infinite loop guard:** writes to `audit_log` itself are NOT audited.

---

## 5. Runtime pipeline

### 5.1 Request-scoped context (`lib/context.ts`)

Every authenticated request runs inside an `AsyncLocalStorage` store. Prisma extensions read from it to know the current tenant and user.

```ts
import { AsyncLocalStorage } from 'node:async_hooks'
import type { UserRole } from '@prisma/client'

export type RequestContext = {
  userId: string
  exploitantId: string             // for admins impersonating a tenant: the impersonated tenant
  role: UserRole
  impersonatedBy?: string          // set ONLY when an admin is acting as a tenant
}

const als = new AsyncLocalStorage<RequestContext>()

export const runWithContext = <T>(ctx: RequestContext, fn: () => T) => als.run(ctx, fn)
export const getContext     = (): RequestContext => {
  const c = als.getStore()
  if (!c) throw new Error('getContext() called outside request scope')
  return c
}
export const tryGetContext  = (): RequestContext | null => als.getStore() ?? null
```

**Gotcha:** ALS must be entered before the first Prisma call. You cannot use `db` in a top-level module expression. Every query must live inside a function.

### 5.2 Auth wrapper (`lib/auth/requireAuth.ts`)

```ts
import { auth } from '@/lib/auth'
import { runWithContext } from '@/lib/context'
import { UnauthorizedError } from '@/lib/errors'

export async function requireAuth<T>(fn: () => Promise<T>): Promise<T> {
  const session = await auth()
  if (!session?.user) throw new UnauthorizedError()
  return runWithContext({
    userId: session.user.id,
    exploitantId: session.user.exploitantId,
    role: session.user.role,
  }, fn)
}
```

Used in every server component / server action / route handler that touches tenanted data.

### 5.3 Two Prisma clients (`lib/db/index.ts`)

```ts
import { PrismaClient } from '@prisma/client'
import { tenantExtension } from './tenant-extension'
import { auditExtension } from './audit-extension'

const base = new PrismaClient({ log: ['warn', 'error'] })

/** Tenant-scoped client. Default for 99% of code. */
export const db = base.$extends(tenantExtension).$extends(auditExtension)

/** Unscoped client. Import restricted to lib/admin/** by ESLint. Still audited. */
export const adminDb = base.$extends(auditExtension)
```

### 5.4 Tenant extension (`lib/db/tenant-extension.ts`)

Config-driven via a field map so P1/P2 extend it by adding entries, not by changing logic.

```ts
import { Prisma } from '@prisma/client'
import { tryGetContext } from '@/lib/context'

/**
 * For each tenant-scoped model, the column used to filter by exploitantId.
 * Exploitant itself is scoped by its `id` (the tenant sees only itself).
 * P1 will add: Ballon, Pilote -> 'exploitantId'
 * P2 will add: Vol, Billet, Passager, Paiement -> 'exploitantId'
 */
const TENANT_FILTER: Record<string, string> = {
  Exploitant: 'id',
  User:       'exploitantId',
  AuditLog:   'exploitantId',
}

/** Models deliberately NOT tenant-scoped (Auth.js internals). */
const UNTENANTED = new Set(['Account', 'Session', 'VerificationToken'])

export const tenantExtension = Prisma.defineExtension({
  name: 'tenant-isolation',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const ctx = tryGetContext()

        if (UNTENANTED.has(model)) return query(args)

        const field = TENANT_FILTER[model]
        if (!field) {
          // Unknown model -> fail closed. Forces every new model to be classified.
          throw new Error(`tenant-extension: unclassified model "${model}". Add it to TENANT_FILTER or UNTENANTED.`)
        }

        if (!ctx) {
          throw new Error(`${model}.${operation}() called outside request context. Wrap in requireAuth() or use scripts/ + adminDb.`)
        }

        // read-like + scoped mutations: add where filter
        if (
          operation.startsWith('find')
          || ['count','aggregate','groupBy','update','updateMany','delete','deleteMany','upsert'].includes(operation)
        ) {
          args.where = { ...args.where, [field]: ctx.exploitantId }
        }

        // creates: inject tenant into data (only for models scoped by exploitantId, not Exploitant itself)
        if (field === 'exploitantId' && (operation === 'create' || operation === 'createMany')) {
          const enforceTenant = (d: any) => {
            // If the caller passed an explicit exploitantId that doesn't match the current context,
            // FAIL LOUD. Silent correction hides application bugs and confuses debugging.
            if ('exploitantId' in d && d.exploitantId !== ctx.exploitantId) {
              throw new Error(
                `${model}.${operation}(): explicit exploitantId=${d.exploitantId} does not match current context ${ctx.exploitantId}. ` +
                `Omit exploitantId from data — it is injected automatically by the tenant extension.`
              )
            }
            return { ...d, exploitantId: ctx.exploitantId }
          }
          if ('data' in args) {
            args.data = Array.isArray(args.data) ? args.data.map(enforceTenant) : enforceTenant(args.data)
          }
        }

        return query(args)
      }
    }
  }
})
```

**Fail-closed design:**
- Unknown models throw (forces classification).
- Missing context throws (forces `requireAuth()` or explicit `adminDb` usage).
- No bypass branch for super-admins. Cross-tenant access uses `adminDb` or `impersonate()`.

### 5.5 Audit extension (`lib/db/audit-extension.ts`)

Runs after the tenant extension. Sketch:

```ts
export const auditExtension = Prisma.defineExtension({
  name: 'audit-log',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Never audit the audit table itself
        if (model === 'AuditLog') return query(args)

        const ctx = tryGetContext()
        const now = new Date()

        // READS: pass through
        if (operation.startsWith('find') || ['count','aggregate','groupBy'].includes(operation)) {
          return query(args)
        }

        // For UPDATE / DELETE: fetch before-row for diffing. Extra SELECT, accepted cost.
        let beforeRow: any = null
        if (['update','delete'].includes(operation)) {
          beforeRow = await (base as any)[lowerFirst(model)].findUnique({ where: args.where })
        }

        const result = await query(args)

        // Write audit rows via a raw Prisma call on the BASE client (to avoid re-entering this extension)
        await writeAuditRows(base, {
          model, operation, args, result, beforeRow, ctx, now
        })

        return result
      }
    }
  }
})
```

`writeAuditRows` handles the CREATE / UPDATE / DELETE cases with field-level diffs for UPDATE and row-level captures for CREATE/DELETE. `updateMany` / `deleteMany` write a single aggregate audit row with counts (per-row diffing is too expensive and the operation is rare outside admin work).

### 5.6 Crypto lib (`lib/crypto.ts`)

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16
const KEY_LENGTH = 32

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex) throw new Error('ENCRYPTION_KEY missing')
  const key = Buffer.from(hex, 'hex')
  if (key.length !== KEY_LENGTH) throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars)')
  return key
}

// Format: base64(iv[12] || tag[16] || ciphertext[*])
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64')
}

export function decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, 'base64')
  const iv = buf.subarray(0, IV_LENGTH)
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const enc = buf.subarray(IV_LENGTH + TAG_LENGTH)
  const d = createDecipheriv(ALGO, getKey(), iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8')
}
```

### 5.7 Impersonation helper (`lib/admin/impersonate.ts`)

```ts
import { getContext, runWithContext } from '@/lib/context'

export async function impersonate<T>(
  targetExploitantId: string,
  fn: () => Promise<T>
): Promise<T> {
  const admin = getContext()
  if (admin.role !== 'ADMIN_CALPAX') {
    throw new Error('impersonate() requires ADMIN_CALPAX role')
  }
  return runWithContext({
    userId: admin.userId,
    exploitantId: targetExploitantId,
    role: admin.role,
    impersonatedBy: admin.userId,
  }, fn)
}
```

The `impersonatedBy` field flows through `requestContext` → `audit-extension` → `audit_log.impersonatedBy`, so every action taken while impersonating is traceable back to the admin.

### 5.8 Auth flow for the P0 demo

1. User visits `/fr/auth/signin`, enters their email.
2. Auth.js Email provider generates a one-shot token, stores a `VerificationToken` row, sends a magic link via Resend.
3. User clicks the link. Auth.js validates the token, deletes it, creates a `Session` row, sets the session cookie, redirects to `/fr`.
4. `/fr` is a server component wrapped in `requireAuth()`. It runs `db.exploitant.findFirstOrThrow()` + `db.user.findFirstOrThrow({ where: { id: getContext().userId } })`. Both queries are automatically scoped by the ALS context.
5. Page renders: `Connecté en tant que {user.name} — Exploitant {exploitant.name}`.
6. Logout button → `signOut()` → deletes the `Session` row.

---

## 6. Project structure

```
calpax-v2/
├── app/
│   └── [locale]/                       # next-intl: /fr/..., /en/...
│       ├── (auth)/
│       │   └── signin/page.tsx
│       ├── (app)/
│       │   ├── layout.tsx              # wraps children in requireAuth
│       │   └── page.tsx                # THE P0 demo page
│       ├── admin/                      # ADMIN_CALPAX only — adminDb import allowed
│       │   └── layout.tsx
│       └── layout.tsx
├── app/api/auth/[...nextauth]/route.ts
├── lib/
│   ├── auth/
│   │   ├── index.ts                    # Auth.js v5 config
│   │   └── requireAuth.ts
│   ├── db/
│   │   ├── index.ts                    # exports db + adminDb
│   │   ├── tenant-extension.ts
│   │   ├── audit-extension.ts
│   │   └── raw/                        # whitelisted raw SQL (empty in P0)
│   ├── admin/                          # only folder allowed to import adminDb
│   │   ├── impersonate.ts
│   │   └── README.md                   # "only place adminDb lives"
│   ├── context.ts                      # AsyncLocalStorage
│   ├── crypto.ts
│   ├── logger.ts                       # Pino
│   └── errors.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                         # Calpax SAS + Cameron Balloons + Olivier + Damien
├── messages/
│   ├── fr.json
│   └── en.json
├── tests/
│   ├── unit/                           # vitest, no DB
│   ├── integration/                    # vitest + supabase start, real DB
│   └── e2e/
│       └── smoke.spec.ts               # Playwright
├── supabase/
│   └── config.toml                     # supabase CLI
├── scripts/                            # CLI; adminDb import allowed
├── .github/workflows/ci.yml
├── eslint.config.js                    # flat config; custom restriction rule
├── next.config.ts
├── tsconfig.json
├── package.json
├── pnpm-lock.yaml
├── .env.example
└── .env.local                          # gitignored
```

### 6.1 ESLint restriction rule

```js
// eslint.config.js (excerpt)
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // ... base config
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['lib/admin/**', 'app/**/admin/**', 'lib/db/**', 'scripts/**', 'prisma/seed.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: '@/lib/db',
          importNames: ['adminDb'],
          message: 'adminDb can only be imported from lib/admin/**, app/**/admin/**, scripts/**, or prisma/seed.ts.'
        }]
      }]
    }
  },
  // Raw SQL guard: ban $queryRaw* outside lib/db/raw/
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['lib/db/raw/**'],
    rules: {
      'no-restricted-properties': ['error',
        { object: 'db', property: '$queryRaw', message: 'raw SQL belongs in lib/db/raw/' },
        { object: 'db', property: '$queryRawUnsafe', message: 'raw SQL belongs in lib/db/raw/' },
        { object: 'db', property: '$executeRaw', message: 'raw SQL belongs in lib/db/raw/' },
        { object: 'db', property: '$executeRawUnsafe', message: 'raw SQL belongs in lib/db/raw/' },
        { object: 'adminDb', property: '$queryRaw', message: 'raw SQL belongs in lib/db/raw/' },
        { object: 'adminDb', property: '$queryRawUnsafe', message: 'raw SQL belongs in lib/db/raw/' },
        { object: 'adminDb', property: '$executeRaw', message: 'raw SQL belongs in lib/db/raw/' },
        { object: 'adminDb', property: '$executeRawUnsafe', message: 'raw SQL belongs in lib/db/raw/' }
      ]
    }
  }
)
```

---

## 7. Provisioning checklist

Click-through work. Each item has a "done" check for the exit criteria.

1. **Supabase** — free account → create org `Calpax` → create project `calpax-v2-prod` in `eu-west-3` (Paris) → create project `calpax-v2-staging` in `eu-west-3`. Free tier for both.
2. **Supabase CLI** — `brew install supabase/tap/supabase` → `supabase init` in the repo → `supabase start` brings up local Postgres + Studio + auth in Docker.
3. **Resend** — free tier → verify `calpax.fr` domain (SPF, DKIM, DMARC DNS records generated during P0 implementation).
4. **Vercel** — free Hobby tier → sign in with GitHub → import `Calpax-aaS/calpax-v2` → add two domains: `calpax.fr` (prod, `main` branch) + `staging.calpax.fr` (staging, `main` branch after prod, or a dedicated `staging` branch). Configure env vars per environment via Vercel dashboard.
5. **Sentry** — free tier → project `calpax-v2` → copy DSN.
6. **Domain DNS** — `calpax.fr` A record → Vercel + `CNAME` for `www` → Vercel + `CNAME` for `staging` → Vercel. Let's Encrypt handled automatically by Vercel.
7. **GitHub** — branch protection on `main`: require CI green, require linear history (no merge commits), require signed commits (optional).

---

## 8. Environment variables

```env
# .env.example
# Supabase / database
DATABASE_URL="postgresql://..."           # pgbouncer pooled, for app queries
DIRECT_URL="postgresql://..."             # direct, for prisma migrate

# Auth.js v5
AUTH_SECRET=""                            # openssl rand -base64 32
AUTH_URL="https://calpax.fr"              # per-env: localhost / staging / prod

# Resend (transactional email)
RESEND_API_KEY=""
EMAIL_FROM="no-reply@calpax.fr"

# App-level crypto — NEVER rotate without a re-encrypt migration
ENCRYPTION_KEY=""                         # openssl rand -hex 32 (64 chars)

# Sentry
SENTRY_DSN=""
SENTRY_AUTH_TOKEN=""                      # for source map upload during build

# Seed bootstrap (only read by prisma/seed.ts)
ADMIN_EMAIL="damien@calpax.fr"
SEED_EXPLOITANT_OWNER_EMAIL="olivier@cameronfrance.com"
```

---

## 9. CI pipeline (`.github/workflows/ci.yml`)

| Job | Triggers on | Steps |
|---|---|---|
| **lint-type-unit** | every PR + push to main | pnpm install → eslint (incl. adminDb + raw SQL rules) → tsc --noEmit → vitest run tests/unit |
| **integration** | every PR + push to main | `supabase start` (CI runner) → `prisma migrate deploy` → `prisma db seed` → `vitest run tests/integration` → `supabase stop` |
| **build** | every PR + push to main | `next build` with prod env vars from GitHub secrets |
| **e2e-staging** | push to main only | wait for staging Vercel deployment → `playwright test tests/e2e/smoke.spec.ts` hitting `staging.calpax.fr` |
| **promote-prod** | push to main, only if e2e-staging green | Vercel promote staging → prod; re-run smoke against prod as canary |

Branch protection on `main`: all 5 jobs must be green before merge. No merge without passing integration + e2e-staging.

---

## 10. Non-negotiable tests for P0

### 10.1 Tenant isolation (`tests/integration/tenant-isolation.spec.ts`)

Minimum 5 tests, all must be green before merge:

1. Two exploitants A and B seeded. `runWithContext({ exploitantId: A.id, ... })` → `db.user.findMany()` returns only A's users, never B's.
2. Under A's context, `db.user.create({ data: { exploitantId: B.id, email: '...' } })` → throws `"explicit exploitantId=... does not match current context..."`. No row is created. Fail-loud, not silent correction.
3. Under A's context, `db.user.create({ data: { email: '...' } })` (no explicit exploitantId) → succeeds, row has `exploitantId = A.id` injected by the extension.
4. No `runWithContext()` wrapper → any `db.user.findMany()` call throws immediately.
5. `impersonate(B.id, ...)` from an ADMIN_CALPAX context → queries inside the callback return B's data, and any audit rows written have `impersonatedBy = admin.userId` and `exploitantId = B.id`.

### 10.2 Audit extension (`tests/integration/audit-extension.spec.ts`)

Minimum 5 tests:

1. `db.exploitant.create({ ... })` writes a CREATE audit row with `afterValue = new row`, `field = null`.
2. `db.exploitant.update({ ... })` writes UPDATE audit rows, one per changed field, with before/after per field.
3. `db.exploitant.delete({ ... })` writes a DELETE audit row with `beforeValue = old row`, `field = null`.
4. Writes via `adminDb` (from a whitelisted folder) are audited with `exploitantId = null` unless the operation is on a tenant row (then `exploitantId` is the affected row's tenant).
5. `db.auditLog.create(...)` does NOT itself write an audit row (infinite loop guard).

### 10.3 Crypto (`tests/unit/crypto.spec.ts`)

Minimum 4 tests:

1. `decrypt(encrypt(x)) === x` for a sample of strings (ASCII, UTF-8, empty, long).
2. Tampering with one byte of the ciphertext causes `decrypt()` to throw (GCM auth tag failure).
3. Missing `ENCRYPTION_KEY` env var → throws at first encrypt/decrypt call.
4. Wrong key length (not 32 bytes) → throws clearly.

### 10.4 Meta-test — ESLint restriction (`tests/integration/eslint-rules.spec.ts`)

1. Write a temp file in `app/page.tsx` that does `import { adminDb } from '@/lib/db'`. Run eslint. Expect non-zero exit + the restriction message. Clean up the temp file.
2. Same test with `$queryRaw` usage in a regular file → expect non-zero exit + the raw-SQL message.

### 10.5 E2E smoke (`tests/e2e/smoke.spec.ts`)

One test = the full P0 demo path:

1. Visit `/fr`.
2. Expect redirect to `/fr/auth/signin`.
3. Fill the email field with `olivier@cameronfrance.com`.
4. Click submit.
5. **Magic link step** — in CI, Playwright reads the magic link from the Resend test inbox (or a mocked mail catcher). In local dev, same pattern with `supabase` local auth hooks.
6. Navigate to the magic link URL.
7. Expect redirect to `/fr`.
8. Expect the page body to contain `Connecté en tant que Olivier Cuenot — Exploitant Cameron Balloons France`.
9. Verify the `Session` row exists in the DB.
10. Verify an audit row was written for the session creation.

---

## 11. Exit criteria (the gate before P1 starts)

All must be checked. Any failure blocks P1.

- [ ] Supabase prod + staging projects provisioned in `eu-west-3`; both reachable
- [ ] Resend domain verified on `calpax.fr` with SPF/DKIM/DMARC green
- [ ] Vercel prod deploys to `calpax.fr`; staging deploys to `staging.calpax.fr`; both serving HTTPS
- [ ] Sentry receiving a test error from prod (intentional trigger on a dev-only route, then removed)
- [ ] Prisma schema (3 business tables + 4 Auth.js tables) migrated to prod and staging
- [ ] `prisma db seed` creates `Calpax SAS` (admin anchor), `Cameron Balloons France` (FR.DEC.059), Olivier GERANT, Damien ADMIN_CALPAX. Idempotent.
- [ ] Tenant isolation tests green (§10.1 — 5 tests)
- [ ] Audit extension tests green (§10.2 — 5 tests)
- [ ] Crypto tests green (§10.3 — 4 tests)
- [ ] ESLint restriction meta-tests green (§10.4 — 2 tests)
- [ ] E2E smoke green on `staging.calpax.fr` (§10.5)
- [ ] E2E smoke green on `calpax.fr` (canary after promotion)
- [ ] CI pipeline green on `main` for 3 consecutive commits
- [ ] Same P0 demo works at `/fr` and `/en` (i18n verified)
- [ ] `README.md` documents: local dev setup, env vars, how to run tests, how to add a new tenanted entity in P1 (pointing at `TENANT_FILTER` in `tenant-extension.ts`)
- [ ] Roadmap spec updated with P0 completion date

---

## 12. Explicitly NOT in P0

Deferred to later phases — do not attempt to build any of these during P0:

- `Ballon`, `Pilote`, `Vol`, `Billet`, `Passager`, `Paiement` Prisma models → P1 / P2
- Performance chart / devis de masse / PVE generation → P2
- Weather fetching → Pw
- Licence BFCL / CAMO alerts → P1
- RGPD consentement / droits interface → P1 (minimal) + P3 (public)
- Any UI beyond login + the one-line home page
- Any background jobs beyond the one that sends Resend magic links
- Rate limiting (P3)
- Public reservation page (P3)
- Mollie integration (P3)
- Any subscription billing (P-SaaS)

---

## 13. Next step

Run the `writing-plans` skill to produce an executable implementation plan from this spec. That plan will break P0 into 10-20 sequenced tasks with clear verification at each step, suitable for `executing-plans` in the implementation session.
