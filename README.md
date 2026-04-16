# Calpax v2

Calpax is a multi-tenant SaaS platform for managing commercial hot-air balloon flights in France and Europe. It covers the full operational cycle: customer reservations, payments, crew and passenger planning, required regulatory documents (PVE, mass estimate), operational weather, and aeronautical compliance for FR.DEC-declared operators.

Current phase: **M1 — client zero dogfood** (Cameron Balloons France, FR.DEC.059, 5+ balloons).

---

## Prerequisites

| Tool         | Version                                       |
| ------------ | --------------------------------------------- |
| Node.js      | 22+                                           |
| pnpm         | 10+                                           |
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
#   BETTER_AUTH_SECRET=<openssl rand -base64 32>
#   BETTER_AUTH_URL=http://localhost:3000
#   NEXT_PUBLIC_APP_URL=http://localhost:3000
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
- `dcuenot@calpax.fr` — ADMIN_CALPAX with password `calpax2026!`
- `olivier@cameronfrance.com` — GERANT for Cameron Balloons with password `calpax2026!`

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
  crypto.ts           AES-256-GCM helpers (encrypt, decrypt, safeDecryptInt)
  errors.ts           Typed error hierarchy (UnauthorizedError, ForbiddenError, etc.)
  format.ts           formatDateFr() and date formatting helpers
  logger.ts           Pino logger

  auth.ts             Better Auth server config (email+password, magic link, Google OAuth, admin plugin)
  auth-client.ts      Better Auth React client (signIn, signOut, useSession, authClient)
  auth/
    requireAuth.ts    Wraps server actions, validates Better Auth session, injects RequestContext
    requireRole.ts    Role guard — throws ForbiddenError if user role not in allowed list

  db/
    base.ts           basePrisma — raw PrismaClient with @prisma/adapter-pg + SSL
    index.ts          db = basePrisma + tenantExtension + auditExtension
                      adminDb = basePrisma + auditExtension (bypasses tenant filter)
    tenant-extension.ts  Injects exploitantId filter on all reads/writes
    audit-extension.ts   Writes AuditLog rows on mutations (with PII redaction)

  admin/
    impersonate.ts    ADMIN_CALPAX-only helper to switch context to another tenant

  pdf/
    build-data.ts     Single source of truth for PVE PDF data (used by dynamic + archival)
    fiche-vol.tsx     @react-pdf/renderer components (3 pages: cover, VISA, meteo)
    generate.tsx      generateFicheVolBuffer() — renders PDF to Buffer

  weather/
    cache.ts          30-min DB cache (WeatherCache table)
    open-meteo.ts     Open-Meteo API client
    classify.ts       Wind classification (OK / WARNING / DANGER)

  actions/*.ts        Server actions, all wrapped in requireAuth + requireRole
```

---

## Authentication & RBAC

Auth: **Better Auth v1.6.4** with email+password (primary), magic link (reset password), Google OAuth (optional), and admin plugin.

Roles (defined in `lib/context.ts`):

| Role           | Access                                                          |
| -------------- | --------------------------------------------------------------- |
| `ADMIN_CALPAX` | Everything + Super Admin area (`/admin/*`)                      |
| `GERANT`       | Full CRUD on their tenant                                       |
| `PILOTE`       | Read ballons/pilotes/billets, their flights + post-flight entry |
| `EQUIPIER`     | Their assigned flights only                                     |

Use `requireAuth()` to wrap server actions and `requireRole('ADMIN_CALPAX', 'GERANT')` inside to enforce role-based restrictions.

The sidebar automatically hides nav items inaccessible to the current user's role.

---

## Super Admin

The Super Admin area lives at `/[locale]/admin/*` and is restricted to `ADMIN_CALPAX`:

- Dashboard: stats + exploitants table with impersonation button
- Users: cross-tenant user list with role, exploitant, last login
- Sessions: active Better Auth sessions with revocation
- Audit: cross-tenant audit log with per-exploitant filter
- Invitations: create new users with email, exploitant, role, and temporary password

Cross-tenant queries use `basePrisma` (not tenant-scoped `db`). Every admin page re-validates the `ADMIN_CALPAX` role.

---

## How to add a new tenanted entity

1. **Add model to `prisma/schema.prisma`** with an `exploitantId String` field and relation to `Exploitant`.

2. **Register it in `TENANT_FILTER`** (`lib/db/tenant-extension.ts`):

   ```ts
   export const TENANT_FILTER: Record<string, string> = {
     Exploitant: 'id',
     User: 'exploitantId',
     Ballon: 'exploitantId', // <-- new model
   }
   ```

3. **Run a migration**:

   ```bash
   pnpm exec prisma migrate dev --name add-ballon
   ```

4. **Write server actions** in `lib/actions/<entity>.ts`, wrap in `requireAuth()` + `requireRole(...)`.

5. **Write integration tests** asserting tenant isolation (see `tests/integration/tenant-isolation.spec.ts`).

---

## Environment variables reference

| Variable               | Required   | Description                                            |
| ---------------------- | ---------- | ------------------------------------------------------ |
| `DATABASE_URL`         | yes        | PostgreSQL connection string (pooled)                  |
| `DATABASE_URL_DIRECT`  | yes (prod) | Direct connection for migrations                       |
| `BETTER_AUTH_SECRET`   | yes        | `openssl rand -base64 32`                              |
| `BETTER_AUTH_URL`      | yes        | App base URL (e.g. `https://calpax.fr`)                |
| `NEXT_PUBLIC_APP_URL`  | yes        | Same as BETTER_AUTH_URL, exposed to client             |
| `ENCRYPTION_KEY`       | yes        | 64-hex-char key for AES-256-GCM                        |
| `RESEND_API_KEY`       | yes (prod) | Resend API key for magic links & reset password emails |
| `EMAIL_FROM`           | no         | From address for transactional emails                  |
| `SUPABASE_CA_CERT`     | yes (prod) | CA cert for secure Postgres TLS                        |
| `GOOGLE_CLIENT_ID`     | no         | Google OAuth — enables "Continue with Google"          |
| `GOOGLE_CLIENT_SECRET` | no         | Google OAuth                                           |
| `SENTRY_DSN`           | no         | Error monitoring                                       |
| `SENTRY_AUTH_TOKEN`    | no         | Sentry source maps upload                              |
| `CRON_SECRET`          | yes (prod) | Bearer token to protect Vercel Cron endpoints          |

---

## Deployment

Vercel deploys automatically on push to `main`. CI pipeline:

1. **Lint / Typecheck / Unit tests** (parallel with build)
2. **Integration tests** (Supabase local)
3. **Build** (Next.js)
4. **Migrate production DB** (`prisma migrate deploy` + conditional seed)
5. **E2E — flight lifecycle** (Playwright against `https://www.calpax.fr`)

All 5 jobs must pass for deploy to be promoted.
