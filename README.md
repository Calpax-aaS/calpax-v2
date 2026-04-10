# Calpax v2

Calpax is a multi-tenant SaaS platform for managing commercial hot-air balloon flights in France and Europe. It covers the full operational cycle: customer reservations, payments, crew and passenger planning, required regulatory documents (PVE, mass estimate), operational weather, GPS tracking, and aeronautical compliance for FR.DEC-declared operators.

Current phase: **P0 Foundation** — authentication, multi-tenancy, admin scaffold, and CI/CD plumbing. No flight-management features yet.

---

## Prerequisites

| Tool         | Version                                       |
| ------------ | --------------------------------------------- |
| Node.js      | 22+                                           |
| pnpm         | 9+                                            |
| Docker       | latest (for Supabase CLI)                     |
| Supabase CLI | latest (`brew install supabase/tap/supabase`) |

---

## First-time setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start local Supabase (Postgres on port 54322)
supabase start

# 3. Copy env file and fill in required values
cp .env.example .env.local
# Required for local dev:
#   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
#   AUTH_SECRET=<any-32-char-random-string>
#   ENCRYPTION_KEY=<64-hex-chars>

# 4. Run migrations
pnpm exec prisma migrate deploy

# 5. Seed the database
pnpm exec tsx prisma/seed.ts

# 6. Start dev server
pnpm dev
```

The seed creates:

- `Calpax SAS` (frDecNumber: `INTERNAL.CALPAX`) — internal admin tenant
- `Cameron Balloons France` (frDecNumber: `FR.DEC.059`) — first real tenant
- `damien@calpax.fr` — ADMIN_CALPAX
- `olivier@cameronfrance.com` — GERANT for Cameron Balloons

---

## Daily dev commands

```bash
pnpm dev           # Next.js dev server on http://localhost:3000
pnpm format        # Prettier
pnpm lint          # ESLint
pnpm typecheck     # tsc --noEmit
```

---

## Test commands

```bash
pnpm test                   # Unit tests (vitest, jsdom)
pnpm test:watch             # Unit tests in watch mode
pnpm test:coverage          # Unit tests with coverage report
pnpm test:integration       # Integration tests against local Supabase
pnpm test:e2e               # Playwright E2E (requires dev server)
```

Integration tests require `supabase start` and a migrated + seeded database.

E2E tests start the dev server automatically via Playwright's `webServer` config.

---

## Architecture overview

```
lib/
  context.ts          AsyncLocalStorage — request-scoped userId, exploitantId, role
  crypto.ts           AES-256-GCM helpers for encrypting sensitive fields (e.g. passenger weight)
  errors.ts           Typed error hierarchy (UnauthorizedError, etc.)
  logger.ts           Pino logger

  auth/
    index.ts          Auth.js v5 config — Resend magic-link + Prisma adapter
    requireAuth.ts    Reads session, runs the handler inside runWithContext()

  db/
    base.ts           basePrisma — raw PrismaClient with @prisma/adapter-pg
    index.ts          db = basePrisma + tenantExtension + auditExtension
                      adminDb = basePrisma + auditExtension (bypasses tenant filter)
    tenant-extension.ts  Injects exploitantId filter on all reads/writes
    audit-extension.ts   Writes AuditLog rows on mutations
    raw/              Typed wrappers around raw SQL (migrations, reports)

  admin/
    impersonate.ts    ADMIN_CALPAX-only helper to switch context to another tenant
```

---

## How to add a new tenanted entity (P1+)

Follow these steps every time you introduce a model that belongs to an exploitant.

1. **Add model to `prisma/schema.prisma`** with an `exploitantId String` field and a relation to `Exploitant`.
2. **Register it in `TENANT_FILTER`** (`lib/db/tenant-extension.ts`):
   ```ts
   export const TENANT_FILTER: Record<string, string> = {
     Exploitant: 'id',
     User: 'exploitantId',
     AuditLog: 'exploitantId',
     Ballon: 'exploitantId', // <-- new model
   }
   ```
3. **Run a migration**:
   ```bash
   pnpm exec prisma migrate dev --name add-ballon
   ```
4. **Write integration tests** that assert tenant isolation: one context must not see another tenant's rows. Use the helpers in `tests/integration/fixtures/`.

---

## Environment variables reference

| Variable            | Required   | Description                                    |
| ------------------- | ---------- | ---------------------------------------------- |
| `DATABASE_URL`      | yes        | PostgreSQL connection string                   |
| `AUTH_SECRET`       | yes        | Auth.js session signing secret                 |
| `ENCRYPTION_KEY`    | yes        | 64-hex-char key for AES-256-GCM                |
| `RESEND_API_KEY`    | no (local) | Resend key — magic links won't send without it |
| `RESEND_FROM_EMAIL` | no         | From address for auth emails                   |
