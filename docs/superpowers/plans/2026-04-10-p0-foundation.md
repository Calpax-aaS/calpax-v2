# P0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the multi-tenant, audited, tenant-isolated skeleton that every subsequent phase of Calpax v2 sits on. The only user-visible artefact is a magic-link login flow that lands on a one-line home page rendering the authenticated user's name and their exploitant, proving every layer (auth, i18n, Prisma tenant isolation, audit, deploy pipeline) works end-to-end on real infrastructure.

**Architecture:** Next.js 15 App Router + TypeScript strict + Prisma + Supabase Postgres, with request-scoped `AsyncLocalStorage` carrying `{ userId, exploitantId, role, impersonatedBy? }`. Two Prisma clients: `db` (tenant-scoped via a Prisma client extension that injects `WHERE exploitantId = ctx.exploitantId` on every query, fail-closed) and `adminDb` (unscoped, import-restricted to `lib/admin/**` via ESLint). A second Prisma client extension writes to a generic `audit_log` table after every mutation. Auth via Auth.js v5 with Resend magic links. Three environments: per-PR preview, staging (`staging.calpax.fr`), production (`calpax.fr`), both Supabase projects in `eu-west-3`.

**Tech Stack:** Next.js 15, TypeScript 5.x strict, pnpm 9+, Node 22 LTS, Prisma 5.x, Supabase (Postgres + CLI), Auth.js v5 with @auth/prisma-adapter, Resend, Tailwind + shadcn/ui, next-intl, react-hook-form + zod, Vitest, Playwright, @testing-library/react, Pino, Sentry, ESLint flat config + typescript-eslint, Prettier, Husky + lint-staged, GitHub Actions, Vercel.

**Spec reference:** `docs/superpowers/specs/2026-04-10-p0-foundation-design.md`

---

## File structure map

Before task-by-task execution, here are every file this plan creates or modifies, grouped by responsibility. One file = one clear purpose.

### Config / scaffolding (created once by CLI or by task)
- `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.ts` — standard Next.js scaffold
- `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css` — Tailwind
- `eslint.config.js` — flat config with `adminDb` + raw-SQL restriction rules
- `.prettierrc`, `.prettierignore` — Prettier
- `.husky/pre-commit` — Husky hook
- `vitest.config.ts` — Vitest
- `playwright.config.ts` — Playwright
- `.env.example` — env var manifest
- `README.md` — local dev setup + testing + "how to add a tenanted entity"
- `.github/workflows/ci.yml` — CI pipeline

### Supabase + Prisma
- `supabase/config.toml` — Supabase CLI config
- `prisma/schema.prisma` — Exploitant + User + AuditLog + Auth.js tables
- `prisma/migrations/*` — generated migrations
- `prisma/seed.ts` — Calpax SAS + Cameron Balloons + Olivier + Damien

### Core libs (pure, no framework deps where possible)
- `lib/errors.ts` — custom error classes (`UnauthorizedError`, `ForbiddenError`, `NotFoundError`)
- `lib/logger.ts` — Pino logger
- `lib/crypto.ts` — AES-256-GCM encrypt/decrypt
- `lib/context.ts` — `AsyncLocalStorage` request context

### Prisma pipeline
- `lib/db/base.ts` — unextended `PrismaClient` (internal)
- `lib/db/tenant-extension.ts` — `TENANT_FILTER` map + `$allOperations` extension
- `lib/db/audit-extension.ts` — `$allOperations` extension writing `audit_log`
- `lib/db/index.ts` — exports `db` and `adminDb` (both extended)
- `lib/db/raw/README.md` — whitelist marker folder for raw SQL (empty for P0)

### Admin escape hatch
- `lib/admin/impersonate.ts` — `impersonate(exploitantId, fn)` helper
- `lib/admin/README.md` — "only folder allowed to import `adminDb`"

### Auth
- `lib/auth/index.ts` — Auth.js v5 config (`auth`, `handlers`, `signIn`, `signOut`)
- `lib/auth/requireAuth.ts` — `requireAuth(fn)` wrapper
- `app/api/auth/[...nextauth]/route.ts` — Auth.js route handlers

### i18n
- `i18n.ts` — next-intl config
- `middleware.ts` — next-intl middleware for locale routing
- `messages/fr.json`, `messages/en.json` — translations

### App routes (the P0 demo surface)
- `app/layout.tsx` — root layout (minimal, i18n provider)
- `app/[locale]/layout.tsx` — per-locale layout
- `app/[locale]/(auth)/signin/page.tsx` — sign-in page with email form
- `app/[locale]/(app)/layout.tsx` — auth-guarded layout wrapping children in `requireAuth`
- `app/[locale]/(app)/page.tsx` — the one-line home page (the P0 demo)
- `app/[locale]/(app)/signout/route.ts` — sign-out POST handler
- `app/[locale]/admin/layout.tsx` — admin shell (ADMIN_CALPAX only)

### Tests
- `tests/unit/crypto.spec.ts` — AES-256-GCM round-trip + tamper + missing key
- `tests/unit/context.spec.ts` — ALS basic flow
- `tests/integration/tenant-isolation.spec.ts` — 5 tests from spec §10.1
- `tests/integration/audit-extension.spec.ts` — 5 tests from spec §10.2
- `tests/integration/eslint-rules.spec.ts` — meta-tests from spec §10.4
- `tests/integration/helpers.ts` — shared test helpers (seed two tenants, run in context, reset DB)
- `tests/e2e/smoke.spec.ts` — the full P0 demo path from spec §10.5

---

## Task index

**Phase A — Project scaffolding** (tasks 1–5)
**Phase B — Database + Prisma schema** (tasks 6–9)
**Phase C — Core libs (pure, TDD)** (tasks 10–12)
**Phase D — Prisma pipeline (TDD)** (tasks 13–17)
**Phase E — Auth + i18n + routes** (tasks 18–23)
**Phase F — Tests + CI** (tasks 24–26)
**Phase G — Provisioning + deploy + exit gate** (tasks 27–30)

---

# Phase A — Project scaffolding

---

## Task 1: Initialize Next.js 15 + pnpm + TypeScript strict

**Files:**
- Create: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `public/`, `.gitignore`
- Modify: `.gitignore` (merge with existing)

- [ ] **Step 1: Run create-next-app with pinned flags**

In the repo root (`/Users/dcuenot/Code/github.com/Calpax-aaS/calpax-v2/`):

```bash
pnpm dlx create-next-app@15 . \
  --typescript \
  --app \
  --tailwind \
  --eslint \
  --src-dir=false \
  --import-alias="@/*" \
  --turbopack=false \
  --use-pnpm
```

Expected: creates `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `public/`, and overwrites `.gitignore`.

- [ ] **Step 2: Verify Node version**

```bash
node --version
```

Expected: `v22.x.x` (LTS). If not, `nvm install 22 && nvm use 22` then re-run Step 1.

- [ ] **Step 3: Make tsconfig strict**

Replace `tsconfig.json` with:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "v1-reference"]
}
```

- [ ] **Step 4: Merge .gitignore**

Append Next.js additions to the existing `.gitignore` (which already excludes `v1-reference/`, `.DS_Store`, node_modules, `.next/`, etc. — verify no duplicates):

```bash
cat .gitignore
```

Expected: `v1-reference/`, `.DS_Store`, `node_modules/`, `.next/`, `.env`, `.env*.local` all present. If `create-next-app` added duplicates, dedupe manually.

- [ ] **Step 5: Verify dev server runs**

```bash
pnpm dev
```

Expected: `Local: http://localhost:3000` logged within 3 seconds. Open the URL, confirm the default Next.js page renders. Ctrl+C to stop.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json next.config.ts app/ public/ .gitignore postcss.config.mjs tailwind.config.ts eslint.config.mjs next-env.d.ts
git commit -m "chore: scaffold next.js 15 with pnpm + typescript strict"
```

---

## Task 2: Install runtime + dev dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime dependencies**

```bash
pnpm add \
  @prisma/client \
  next-auth@beta \
  @auth/prisma-adapter \
  next-intl \
  pino \
  resend \
  zod \
  react-hook-form \
  @hookform/resolvers \
  @sentry/nextjs
```

Expected: `package.json` gains these under `dependencies`. Lockfile updated.

- [ ] **Step 2: Install dev dependencies**

```bash
pnpm add -D \
  prisma \
  tsx \
  @types/node \
  vitest \
  @vitest/coverage-v8 \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jsdom \
  @playwright/test \
  prettier \
  eslint-config-prettier \
  husky \
  lint-staged \
  supabase
```

- [ ] **Step 3: Verify all installs**

```bash
pnpm list --depth=0
```

Expected: every package from steps 1 and 2 listed. If any failed to install, resolve by pinning versions.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install runtime + dev dependencies"
```

---

## Task 3: Configure ESLint flat config with restriction rules

**Files:**
- Replace: `eslint.config.mjs`

- [ ] **Step 1: Write the new ESLint config**

Replace `eslint.config.mjs` with:

```js
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),

  // Global ignores
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'v1-reference/**',
      'prisma/migrations/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },

  // adminDb import restriction: only lib/admin/**, app/**/admin/**, scripts/**, prisma/seed.ts
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: [
      'lib/admin/**',
      'app/**/admin/**',
      'lib/db/**',
      'scripts/**',
      'prisma/seed.ts',
      'tests/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/db',
              importNames: ['adminDb'],
              message:
                'adminDb can only be imported from lib/admin/**, app/**/admin/**, scripts/**, or prisma/seed.ts.',
            },
          ],
        },
      ],
    },
  },

  // Raw SQL restriction: ban $queryRaw* and $executeRaw* on db/adminDb outside lib/db/raw/**
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['lib/db/raw/**', 'tests/**'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'db', property: '$queryRaw', message: 'raw SQL belongs in lib/db/raw/' },
        { object: 'db', property: '$queryRawUnsafe', message: 'raw SQL belongs in lib/db/raw/' },
        { object: 'db', property: '$executeRaw', message: 'raw SQL belongs in lib/db/raw/' },
        { object: 'db', property: '$executeRawUnsafe', message: 'raw SQL belongs in lib/db/raw/' },
        { object: 'adminDb', property: '$queryRaw', message: 'raw SQL belongs in lib/db/raw/' },
        { object: 'adminDb', property: '$queryRawUnsafe', message: 'raw SQL belongs in lib/db/raw/' },
        { object: 'adminDb', property: '$executeRaw', message: 'raw SQL belongs in lib/db/raw/' },
        { object: 'adminDb', property: '$executeRawUnsafe', message: 'raw SQL belongs in lib/db/raw/' },
      ],
    },
  },
]

export default config
```

- [ ] **Step 2: Run ESLint on the existing scaffold**

```bash
pnpm lint
```

Expected: zero errors, zero warnings. If `next/core-web-vitals` flags the stock `app/page.tsx`, fix those first.

- [ ] **Step 3: Commit**

```bash
git add eslint.config.mjs
git commit -m "chore: eslint flat config with adminDb and raw SQL restrictions"
```

---

## Task 4: Configure Prettier + Husky + lint-staged

**Files:**
- Create: `.prettierrc`, `.prettierignore`, `.husky/pre-commit`, update `package.json` with lint-staged config

- [ ] **Step 1: Create Prettier config**

Write `.prettierrc`:

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

Write `.prettierignore`:

```
.next
node_modules
v1-reference
prisma/migrations
pnpm-lock.yaml
coverage
playwright-report
test-results
```

- [ ] **Step 2: Install husky**

```bash
pnpm exec husky init
```

Expected: creates `.husky/pre-commit` with a default `pnpm test` line.

- [ ] **Step 3: Overwrite the pre-commit hook**

Replace `.husky/pre-commit` content with:

```sh
pnpm exec lint-staged
```

- [ ] **Step 4: Add lint-staged config to package.json**

Add to `package.json` (merge into the top-level object):

```json
"lint-staged": {
  "*.{ts,tsx}": [
    "prettier --write",
    "eslint --fix"
  ],
  "*.{js,mjs,cjs,json,md}": [
    "prettier --write"
  ]
}
```

Also add scripts:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "format": "prettier --write .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:integration": "vitest run tests/integration",
  "test:e2e": "playwright test",
  "prepare": "husky"
}
```

- [ ] **Step 5: Verify pre-commit hook works**

```bash
touch /tmp/test.ts && cp /tmp/test.ts . && git add test.ts
git commit -m "test: verify hook" --dry-run
git reset HEAD test.ts && rm test.ts
```

Expected: lint-staged runs without error on the (empty) staged file.

- [ ] **Step 6: Commit**

```bash
git add .prettierrc .prettierignore .husky package.json
git commit -m "chore: prettier + husky + lint-staged"
```

---

## Task 5: Configure Vitest + Playwright

**Files:**
- Create: `vitest.config.ts`, `playwright.config.ts`, `tests/setup.ts`, `tests/e2e/.gitkeep`, `tests/unit/.gitkeep`, `tests/integration/.gitkeep`

- [ ] **Step 1: Write vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.spec.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**', 'app/**'],
      exclude: ['**/*.d.ts', '**/*.config.*', '.next/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

Install the missing plugin:

```bash
pnpm add -D @vitejs/plugin-react
```

- [ ] **Step 2: Write tests/setup.ts**

```ts
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
```

- [ ] **Step 3: Write playwright.config.ts**

```ts
import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PORT ?? 3000)
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'pnpm dev',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
})
```

- [ ] **Step 4: Install Playwright browsers**

```bash
pnpm exec playwright install chromium
```

- [ ] **Step 5: Create test folder placeholders**

```bash
mkdir -p tests/unit tests/integration tests/e2e
touch tests/unit/.gitkeep tests/integration/.gitkeep tests/e2e/.gitkeep
```

- [ ] **Step 6: Write a sanity unit test**

Create `tests/unit/sanity.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('sanity', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 7: Run the sanity test**

```bash
pnpm test
```

Expected: 1 test passing.

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts playwright.config.ts tests/ package.json pnpm-lock.yaml
git commit -m "chore: vitest + playwright + sanity test"
```

---

# Phase B — Database + Prisma schema

---

## Task 6: Initialize Supabase CLI + local Postgres

**Files:**
- Create: `supabase/config.toml`, `supabase/seed.sql` (empty for now)

- [ ] **Step 1: Verify Supabase CLI installed**

```bash
supabase --version
```

Expected: `1.x.x` or higher. If not, `brew install supabase/tap/supabase`.

- [ ] **Step 2: Initialize Supabase workspace**

```bash
supabase init
```

Expected: creates `supabase/config.toml` and `supabase/seed.sql`.

- [ ] **Step 3: Verify Docker is running**

```bash
docker ps
```

Expected: Docker daemon responds. If not, start Docker Desktop.

- [ ] **Step 4: Start local Supabase**

```bash
supabase start
```

Expected: output lists local URLs for API, DB, Studio. Note the `DB URL` (usually `postgresql://postgres:postgres@127.0.0.1:54322/postgres`) — you'll need it for `DATABASE_URL` locally.

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "chore: initialize supabase cli + local postgres"
```

---

## Task 7: Initialize Prisma + base config

**Files:**
- Create: `prisma/schema.prisma`, `.env` (gitignored), `.env.example`

- [ ] **Step 1: Initialize Prisma**

```bash
pnpm exec prisma init --datasource-provider postgresql
```

Expected: creates `prisma/schema.prisma` and `.env` with a placeholder `DATABASE_URL`.

- [ ] **Step 2: Set local DATABASE_URL**

Edit `.env`:

```env
# Local Supabase (from supabase start output)
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
```

- [ ] **Step 3: Write .env.example**

```env
# Supabase / database
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Auth.js v5
AUTH_SECRET=""
AUTH_URL="http://localhost:3000"

# Resend (transactional email)
RESEND_API_KEY=""
EMAIL_FROM="no-reply@calpax.fr"

# App-level crypto - NEVER rotate without a re-encrypt migration
ENCRYPTION_KEY=""

# Sentry
SENTRY_DSN=""
SENTRY_AUTH_TOKEN=""

# Seed bootstrap (only read by prisma/seed.ts)
ADMIN_EMAIL="damien@calpax.fr"
SEED_EXPLOITANT_OWNER_EMAIL="olivier@cameronfrance.com"
```

- [ ] **Step 4: Generate AUTH_SECRET and ENCRYPTION_KEY locally**

```bash
echo "AUTH_SECRET=\"$(openssl rand -base64 32)\"" >> .env
echo "ENCRYPTION_KEY=\"$(openssl rand -hex 32)\"" >> .env
echo "AUTH_URL=\"http://localhost:3000\"" >> .env
echo "EMAIL_FROM=\"no-reply@calpax.fr\"" >> .env
```

Verify `.env` is in `.gitignore`:

```bash
grep -E "^\.env$" .gitignore
```

Expected: matches. If not, add `.env` to `.gitignore`.

- [ ] **Step 5: Replace prisma/schema.prisma with the P0 schema**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Exploitant {
  id          String   @id @default(cuid())
  name        String
  frDecNumber String   @unique
  users       User[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("exploitant")
}

enum UserRole {
  ADMIN_CALPAX
  GERANT
  PILOTE
  EQUIPIER
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  emailVerified DateTime?
  image         String?

  exploitantId String
  exploitant   Exploitant @relation(fields: [exploitantId], references: [id])

  role UserRole @default(GERANT)

  accounts Account[]
  sessions Session[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([exploitantId])
  @@map("user")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("account")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("session")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_token")
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
}

model AuditLog {
  id             BigInt      @id @default(autoincrement())
  exploitantId   String?
  userId         String?
  impersonatedBy String?
  entityType     String
  entityId       String
  action         AuditAction
  field          String?
  beforeValue    Json?
  afterValue     Json?
  createdAt      DateTime    @default(now())

  @@index([exploitantId, entityType, entityId])
  @@index([impersonatedBy])
  @@index([createdAt])
  @@map("audit_log")
}
```

- [ ] **Step 6: Format the schema**

```bash
pnpm exec prisma format
```

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma .env.example
git commit -m "feat(prisma): p0 schema with exploitant, user, auditlog + auth.js tables"
```

Do NOT add `.env` — it's gitignored.

---

## Task 8: Create first migration + generated client

**Files:**
- Create: `prisma/migrations/<timestamp>_init/migration.sql`

- [ ] **Step 1: Create the migration**

```bash
pnpm exec prisma migrate dev --name init
```

Expected: creates `prisma/migrations/<timestamp>_init/migration.sql`, applies it to the local Supabase DB, and generates the Prisma client.

- [ ] **Step 2: Verify tables exist in local DB**

```bash
pnpm exec prisma studio
```

Expected: Studio opens at `http://localhost:5555` showing the 6 tables: `exploitant`, `user`, `account`, `session`, `verification_token`, `audit_log`. Close Studio.

- [ ] **Step 3: Commit the migration**

```bash
git add prisma/migrations/
git commit -m "feat(prisma): initial migration"
```

---

## Task 9: Write Prisma seed script

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (add `prisma.seed` config)

- [ ] **Step 1: Write prisma/seed.ts**

```ts
// prisma/seed.ts
import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'damien@calpax.fr'
  const ownerEmail = process.env.SEED_EXPLOITANT_OWNER_EMAIL ?? 'olivier@cameronfrance.com'

  // Calpax SAS — the anchor exploitant for ADMIN_CALPAX users
  const calpaxSas = await prisma.exploitant.upsert({
    where: { frDecNumber: 'INTERNAL.CALPAX' },
    update: {},
    create: {
      name: 'Calpax SAS',
      frDecNumber: 'INTERNAL.CALPAX',
    },
  })

  // Cameron Balloons France — the client zéro
  const cameronBalloons = await prisma.exploitant.upsert({
    where: { frDecNumber: 'FR.DEC.059' },
    update: {},
    create: {
      name: 'Cameron Balloons France',
      frDecNumber: 'FR.DEC.059',
    },
  })

  // Damien — ADMIN_CALPAX
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Damien Cuenot',
      role: UserRole.ADMIN_CALPAX,
      exploitantId: calpaxSas.id,
    },
  })

  // Olivier — GERANT of Cameron Balloons
  await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      name: 'Olivier Cuenot',
      role: UserRole.GERANT,
      exploitantId: cameronBalloons.id,
    },
  })

  console.log('Seed complete:')
  console.log('  - Exploitant: Calpax SAS (INTERNAL.CALPAX)')
  console.log('  - Exploitant: Cameron Balloons France (FR.DEC.059)')
  console.log(`  - User: ${adminEmail} (ADMIN_CALPAX)`)
  console.log(`  - User: ${ownerEmail} (GERANT)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

- [ ] **Step 2: Add seed config to package.json**

Merge into `package.json`:

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

- [ ] **Step 3: Run the seed**

```bash
pnpm exec prisma db seed
```

Expected: logs the 4 created entities, no errors. Running a second time should be idempotent (upsert).

- [ ] **Step 4: Verify in Studio**

```bash
pnpm exec prisma studio
```

Open, confirm `exploitant` has 2 rows, `user` has 2 rows.

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat(prisma): seed calpax sas + cameron balloons + olivier + damien"
```

---

# Phase C — Core libs (pure, TDD)

---

## Task 10: lib/crypto (AES-256-GCM with TDD)

**Files:**
- Create: `lib/crypto.ts`
- Test: `tests/unit/crypto.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/crypto.spec.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('lib/crypto', () => {
  const validKey = 'a'.repeat(64) // 32 bytes hex
  let originalKey: string | undefined

  beforeEach(() => {
    originalKey = process.env.ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = validKey
  })

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey
  })

  it('round-trips ASCII strings', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto')
    const plain = 'hello world'
    expect(decrypt(encrypt(plain))).toBe(plain)
  })

  it('round-trips UTF-8 strings with accents', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto')
    const plain = 'Olivier Cuénôt — 85 kg — 01 02 03 04 05'
    expect(decrypt(encrypt(plain))).toBe(plain)
  })

  it('round-trips empty strings', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto')
    expect(decrypt(encrypt(''))).toBe('')
  })

  it('produces different ciphertexts for same plaintext (random IV)', async () => {
    const { encrypt } = await import('@/lib/crypto')
    expect(encrypt('same')).not.toBe(encrypt('same'))
  })

  it('throws if ciphertext is tampered (1 byte flipped)', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto')
    const ct = encrypt('hello')
    const buf = Buffer.from(ct, 'base64')
    buf[buf.length - 1] ^= 0xff // flip last byte of the actual ciphertext
    expect(() => decrypt(buf.toString('base64'))).toThrow()
  })

  it('throws if ENCRYPTION_KEY is missing', async () => {
    delete process.env.ENCRYPTION_KEY
    const { encrypt } = await import('@/lib/crypto')
    expect(() => encrypt('x')).toThrow(/ENCRYPTION_KEY missing/)
  })

  it('throws if ENCRYPTION_KEY is wrong length', async () => {
    process.env.ENCRYPTION_KEY = 'abcd'
    const { encrypt } = await import('@/lib/crypto')
    expect(() => encrypt('x')).toThrow(/32 bytes/)
  })
})
```

- [ ] **Step 2: Run tests (should fail)**

```bash
pnpm test tests/unit/crypto.spec.ts
```

Expected: FAIL with "Cannot find module '@/lib/crypto'".

- [ ] **Step 3: Write lib/crypto.ts**

```ts
// lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm' as const
const IV_LENGTH = 12
const TAG_LENGTH = 16
const KEY_LENGTH = 32

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex) throw new Error('ENCRYPTION_KEY missing from environment')
  const key = Buffer.from(hex, 'hex')
  if (key.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be 32 bytes (64 hex chars), got ${key.length} bytes`)
  }
  return key
}

/**
 * Encrypt a UTF-8 string with AES-256-GCM.
 * Output format: base64(iv[12] || tag[16] || ciphertext[*])
 */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

/**
 * Decrypt a ciphertext produced by `encrypt()`.
 * Throws if tampered, wrong key, or malformed input.
 */
export function decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, 'base64')
  if (buf.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('ciphertext too short')
  }
  const iv = buf.subarray(0, IV_LENGTH)
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const enc = buf.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}
```

- [ ] **Step 4: Run tests (should pass)**

```bash
pnpm test tests/unit/crypto.spec.ts
```

Expected: 7 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/crypto.ts tests/unit/crypto.spec.ts
git commit -m "feat(crypto): aes-256-gcm encrypt/decrypt with tdd"
```

---

## Task 11: lib/context (AsyncLocalStorage)

**Files:**
- Create: `lib/context.ts`
- Test: `tests/unit/context.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/context.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { runWithContext, getContext, tryGetContext } from '@/lib/context'

const sampleCtx = {
  userId: 'user_1',
  exploitantId: 'exp_1',
  role: 'GERANT' as const,
}

describe('lib/context', () => {
  it('runWithContext makes ctx available inside', async () => {
    const result = await runWithContext(sampleCtx, async () => getContext())
    expect(result).toEqual(sampleCtx)
  })

  it('getContext throws outside a context', () => {
    expect(() => getContext()).toThrow(/outside request scope/)
  })

  it('tryGetContext returns null outside a context', () => {
    expect(tryGetContext()).toBeNull()
  })

  it('nested contexts stack correctly', async () => {
    const outer = sampleCtx
    const inner = { ...sampleCtx, exploitantId: 'exp_2' }
    const result = await runWithContext(outer, async () => {
      const inside = await runWithContext(inner, async () => getContext())
      const outside = getContext()
      return { inside, outside }
    })
    expect(result.inside.exploitantId).toBe('exp_2')
    expect(result.outside.exploitantId).toBe('exp_1')
  })

  it('context is isolated across parallel tasks', async () => {
    const [a, b] = await Promise.all([
      runWithContext({ ...sampleCtx, exploitantId: 'A' }, async () => {
        await new Promise((r) => setTimeout(r, 5))
        return getContext().exploitantId
      }),
      runWithContext({ ...sampleCtx, exploitantId: 'B' }, async () => {
        return getContext().exploitantId
      }),
    ])
    expect(a).toBe('A')
    expect(b).toBe('B')
  })
})
```

- [ ] **Step 2: Run tests (should fail)**

```bash
pnpm test tests/unit/context.spec.ts
```

Expected: FAIL — `@/lib/context` not found.

- [ ] **Step 3: Write lib/context.ts**

```ts
// lib/context.ts
import { AsyncLocalStorage } from 'node:async_hooks'
import type { UserRole } from '@prisma/client'

export type RequestContext = {
  userId: string
  exploitantId: string
  role: UserRole
  /** Set ONLY when an ADMIN_CALPAX user is acting as a tenant via impersonate(). */
  impersonatedBy?: string
}

const als = new AsyncLocalStorage<RequestContext>()

export function runWithContext<T>(ctx: RequestContext, fn: () => Promise<T> | T): Promise<T> | T {
  return als.run(ctx, fn)
}

export function getContext(): RequestContext {
  const c = als.getStore()
  if (!c) {
    throw new Error(
      'getContext() called outside request scope. Wrap your handler in requireAuth() or runWithContext().',
    )
  }
  return c
}

export function tryGetContext(): RequestContext | null {
  return als.getStore() ?? null
}
```

- [ ] **Step 4: Run tests (should pass)**

```bash
pnpm test tests/unit/context.spec.ts
```

Expected: 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/context.ts tests/unit/context.spec.ts
git commit -m "feat(context): asynclocalstorage request context with tdd"
```

---

## Task 12: lib/errors + lib/logger

**Files:**
- Create: `lib/errors.ts`, `lib/logger.ts`

- [ ] **Step 1: Write lib/errors.ts**

```ts
// lib/errors.ts
export class UnauthorizedError extends Error {
  readonly status = 401
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  readonly status = 403
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends Error {
  readonly status = 404
  constructor(message = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  readonly status = 422
  constructor(message = 'Validation failed') {
    super(message)
    this.name = 'ValidationError'
  }
}
```

- [ ] **Step 2: Write lib/logger.ts**

```ts
// lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  base: { app: 'calpax-v2' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'secret',
      'token',
      '*.encrypted',
    ],
    censor: '[REDACTED]',
  },
})
```

- [ ] **Step 3: Verify they compile**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/errors.ts lib/logger.ts
git commit -m "feat: custom error classes + pino logger"
```

---

# Phase D — Prisma pipeline (TDD)

---

## Task 13: Prisma base client + test helpers

**Files:**
- Create: `lib/db/base.ts`, `tests/integration/helpers.ts`

- [ ] **Step 1: Write lib/db/base.ts**

```ts
// lib/db/base.ts
// Internal unextended Prisma client. Do NOT import from app code.
// Only consumed by lib/db/index.ts and tests/integration/helpers.ts.
import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __prismaBase: PrismaClient | undefined
}

export const basePrisma =
  global.__prismaBase ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  global.__prismaBase = basePrisma
}
```

- [ ] **Step 2: Write tests/integration/helpers.ts**

```ts
// tests/integration/helpers.ts
import type { UserRole } from '@prisma/client'
import { basePrisma } from '@/lib/db/base'
import { runWithContext, type RequestContext } from '@/lib/context'

/** Completely wipes every tenanted + audit row. Keep order FK-safe. */
export async function resetDb() {
  await basePrisma.auditLog.deleteMany({})
  await basePrisma.session.deleteMany({})
  await basePrisma.account.deleteMany({})
  await basePrisma.verificationToken.deleteMany({})
  await basePrisma.user.deleteMany({})
  await basePrisma.exploitant.deleteMany({})
}

export type SeededTenant = {
  exploitantId: string
  userId: string
}

/** Create one exploitant + one GERANT user inside it. Used for isolation tests. */
export async function seedTenant(label: string): Promise<SeededTenant> {
  const exploitant = await basePrisma.exploitant.create({
    data: {
      name: `Exploitant ${label}`,
      frDecNumber: `FR.DEC.${label}`,
    },
  })
  const user = await basePrisma.user.create({
    data: {
      email: `user-${label}@test.local`,
      name: `User ${label}`,
      role: 'GERANT',
      exploitantId: exploitant.id,
    },
  })
  return { exploitantId: exploitant.id, userId: user.id }
}

/** Run `fn` inside a request context matching the given tenant + role. */
export async function asUser<T>(
  tenant: SeededTenant,
  role: UserRole,
  fn: () => Promise<T>,
  opts: { impersonatedBy?: string } = {},
): Promise<T> {
  const ctx: RequestContext = {
    userId: tenant.userId,
    exploitantId: tenant.exploitantId,
    role,
    impersonatedBy: opts.impersonatedBy,
  }
  return runWithContext(ctx, fn) as Promise<T>
}
```

- [ ] **Step 3: Verify compiles**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/db/base.ts tests/integration/helpers.ts
git commit -m "feat(db): base prisma client + integration test helpers"
```

---

## Task 14: Tenant-isolation Prisma extension (TDD)

**Files:**
- Create: `lib/db/tenant-extension.ts`, `lib/db/index.ts` (initial version without audit extension yet)
- Test: `tests/integration/tenant-isolation.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/integration/tenant-isolation.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { resetDb, seedTenant, asUser } from './helpers'

describe('tenant isolation', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('findMany returns only the current tenant rows', async () => {
    const A = await seedTenant('A')
    const B = await seedTenant('B')

    const users = await asUser(A, 'GERANT', async () => db.user.findMany())
    const emails = users.map((u) => u.email)

    expect(emails).toContain('user-A@test.local')
    expect(emails).not.toContain('user-B@test.local')
    expect(users).toHaveLength(1)
  })

  it('create throws on explicit cross-tenant exploitantId', async () => {
    const A = await seedTenant('A')
    const B = await seedTenant('B')

    await expect(
      asUser(A, 'GERANT', async () =>
        db.user.create({
          data: {
            email: 'hacker@test.local',
            exploitantId: B.exploitantId,
          },
        }),
      ),
    ).rejects.toThrow(/does not match current context/)
  })

  it('create injects exploitantId when omitted', async () => {
    const A = await seedTenant('A')

    const created = await asUser(A, 'GERANT', async () =>
      db.user.create({
        data: {
          email: 'new@test.local',
        },
      }),
    )
    expect(created.exploitantId).toBe(A.exploitantId)
  })

  it('throws when called outside request context', async () => {
    await seedTenant('A')
    await expect(db.user.findMany()).rejects.toThrow(/outside request context/)
  })

  it('exploitant.findFirst returns only the current tenant', async () => {
    const A = await seedTenant('A')
    await seedTenant('B')

    const exp = await asUser(A, 'GERANT', async () => db.exploitant.findFirst())
    expect(exp?.frDecNumber).toBe('FR.DEC.A')
  })

  it('findUnique on a cross-tenant id returns null (post-filter)', async () => {
    const A = await seedTenant('A')
    const B = await seedTenant('B')

    // B's user exists; A tries to findUnique it
    const result = await asUser(A, 'GERANT', async () =>
      db.user.findUnique({ where: { id: B.userId } }),
    )
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test (should fail)**

```bash
pnpm test tests/integration/tenant-isolation.spec.ts
```

Expected: FAIL — `@/lib/db` does not export `db`.

- [ ] **Step 3: Write lib/db/tenant-extension.ts**

```ts
// lib/db/tenant-extension.ts
import { Prisma } from '@prisma/client'
import { tryGetContext } from '@/lib/context'

/**
 * For each tenant-scoped model, the column used to filter by exploitantId.
 * Exploitant itself is scoped by its `id` (the tenant sees only itself).
 *
 * P1 will add: Ballon, Pilote -> 'exploitantId'
 * P2 will add: Vol, Billet, Passager, Paiement -> 'exploitantId'
 */
export const TENANT_FILTER: Record<string, string> = {
  Exploitant: 'id',
  User: 'exploitantId',
  AuditLog: 'exploitantId',
}

/** Models deliberately NOT tenant-scoped (Auth.js internals). */
export const UNTENANTED = new Set<string>([
  'Account',
  'Session',
  'VerificationToken',
])

// Ops that accept composable where clauses (we inject the tenant filter in-place)
const COMPOSABLE_READ_OPS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
])
// findUnique rejects mixed unique+non-unique where, so we handle it via post-filter
const UNIQUE_READ_OPS = new Set(['findUnique', 'findUniqueOrThrow'])
const SCOPED_WRITE_OPS = new Set([
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
])
const CREATE_OPS = new Set(['create', 'createMany'])

export const tenantExtension = Prisma.defineExtension({
  name: 'tenant-isolation',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (UNTENANTED.has(model)) {
          return query(args)
        }

        const field = TENANT_FILTER[model]
        if (!field) {
          throw new Error(
            `tenant-extension: unclassified model "${model}". Add it to TENANT_FILTER or UNTENANTED in lib/db/tenant-extension.ts.`,
          )
        }

        const ctx = tryGetContext()
        if (!ctx) {
          throw new Error(
            `${model}.${operation}() called outside request context. Wrap in requireAuth() or use lib/admin/*.`,
          )
        }

        const a = args as Record<string, unknown>

        // findUnique post-filter: run the query with its original unique where,
        // then reject the result if it does not belong to the current tenant.
        if (UNIQUE_READ_OPS.has(operation)) {
          const result = (await query(args)) as Record<string, unknown> | null
          if (result == null) return result
          const rowTenant = result[field]
          if (rowTenant !== ctx.exploitantId) {
            if (operation === 'findUniqueOrThrow') {
              throw new Error(`${model}.findUniqueOrThrow: no record found matching tenant`)
            }
            return null
          }
          return result
        }

        if (COMPOSABLE_READ_OPS.has(operation) || SCOPED_WRITE_OPS.has(operation)) {
          a.where = { ...(a.where as object | undefined), [field]: ctx.exploitantId }
        }

        if (field === 'exploitantId' && CREATE_OPS.has(operation)) {
          const enforceTenant = (d: Record<string, unknown>) => {
            if ('exploitantId' in d && d.exploitantId !== ctx.exploitantId) {
              throw new Error(
                `${model}.${operation}(): explicit exploitantId=${String(d.exploitantId)} does not match current context ${ctx.exploitantId}. ` +
                  'Omit exploitantId from data — it is injected automatically by the tenant extension.',
              )
            }
            return { ...d, exploitantId: ctx.exploitantId }
          }
          if ('data' in a) {
            const data = a.data as Record<string, unknown> | Record<string, unknown>[]
            a.data = Array.isArray(data) ? data.map(enforceTenant) : enforceTenant(data)
          }
        }

        return query(a)
      },
    },
  },
})
```

- [ ] **Step 4: Write lib/db/index.ts (initial, no audit extension yet)**

```ts
// lib/db/index.ts
import { basePrisma } from './base'
import { tenantExtension } from './tenant-extension'

/** Tenant-scoped Prisma client. Default for 99% of code. */
export const db = basePrisma.$extends(tenantExtension)

/**
 * Unscoped Prisma client. Import restricted to lib/admin/** by ESLint.
 * Audit extension will be added in Task 15.
 */
export const adminDb = basePrisma
```

- [ ] **Step 5: Run the test (should pass)**

```bash
pnpm test tests/integration/tenant-isolation.spec.ts
```

Expected: 5 tests passing. If a test fails because the local DB is in a weird state, run `pnpm exec prisma migrate reset --force` and retry.

- [ ] **Step 6: Commit**

```bash
git add lib/db/tenant-extension.ts lib/db/index.ts tests/integration/tenant-isolation.spec.ts
git commit -m "feat(db): tenant-isolation prisma extension with fail-closed design"
```

---

## Task 15: Audit Prisma extension (TDD)

**Files:**
- Create: `lib/db/audit-extension.ts`
- Modify: `lib/db/index.ts` (add audit extension to both clients)
- Test: `tests/integration/audit-extension.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/integration/audit-extension.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { basePrisma } from '@/lib/db/base'
import { resetDb, seedTenant, asUser } from './helpers'

async function auditRowsFor(entityType: string, entityId: string) {
  return basePrisma.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { id: 'asc' },
  })
}

describe('audit extension', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('CREATE writes a row-level audit entry with afterValue', async () => {
    const A = await seedTenant('A')

    const created = await asUser(A, 'GERANT', async () =>
      db.user.create({
        data: { email: 'created@test.local', name: 'New' },
      }),
    )

    const rows = await auditRowsFor('User', created.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.action).toBe('CREATE')
    expect(rows[0]?.field).toBeNull()
    expect(rows[0]?.afterValue).toMatchObject({ email: 'created@test.local', name: 'New' })
    expect(rows[0]?.userId).toBe(A.userId)
    expect(rows[0]?.exploitantId).toBe(A.exploitantId)
  })

  it('UPDATE writes one row per changed field with before/after', async () => {
    const A = await seedTenant('A')

    await asUser(A, 'GERANT', async () => {
      await db.user.update({
        where: { id: A.userId },
        data: { name: 'Changed Name' },
      })
    })

    const rows = await auditRowsFor('User', A.userId)
    const updateRows = rows.filter((r) => r.action === 'UPDATE')
    expect(updateRows.length).toBeGreaterThanOrEqual(1)
    const nameRow = updateRows.find((r) => r.field === 'name')
    expect(nameRow).toBeDefined()
    expect(nameRow?.beforeValue).toBe('User A')
    expect(nameRow?.afterValue).toBe('Changed Name')
  })

  it('DELETE writes a row-level audit entry with beforeValue', async () => {
    const A = await seedTenant('A')
    const deletable = await asUser(A, 'GERANT', async () =>
      db.user.create({ data: { email: 'deletable@test.local', name: 'Del' } }),
    )

    await asUser(A, 'GERANT', async () => {
      await db.user.delete({ where: { id: deletable.id } })
    })

    const rows = await auditRowsFor('User', deletable.id)
    const delRow = rows.find((r) => r.action === 'DELETE')
    expect(delRow).toBeDefined()
    expect(delRow?.field).toBeNull()
    expect(delRow?.beforeValue).toMatchObject({ email: 'deletable@test.local' })
  })

  it('impersonation writes impersonatedBy on audit rows', async () => {
    const admin = await seedTenant('ADMIN')
    const tenant = await seedTenant('T')

    await asUser(
      { exploitantId: tenant.exploitantId, userId: admin.userId },
      'ADMIN_CALPAX',
      async () => {
        await db.user.update({
          where: { id: tenant.userId },
          data: { name: 'Renamed by admin' },
        })
      },
      { impersonatedBy: admin.userId },
    )

    const rows = await auditRowsFor('User', tenant.userId)
    const updateRow = rows.find((r) => r.action === 'UPDATE' && r.field === 'name')
    expect(updateRow?.impersonatedBy).toBe(admin.userId)
    expect(updateRow?.exploitantId).toBe(tenant.exploitantId)
  })

  it('writes to AuditLog itself are NOT re-audited', async () => {
    const A = await seedTenant('A')
    const before = await basePrisma.auditLog.count()

    // Direct write to audit_log via basePrisma (bypasses extension). Should not recurse.
    await basePrisma.auditLog.create({
      data: {
        exploitantId: A.exploitantId,
        userId: A.userId,
        entityType: 'Test',
        entityId: 'manual',
        action: 'CREATE',
        afterValue: { hi: 'there' },
      },
    })

    const after = await basePrisma.auditLog.count()
    expect(after).toBe(before + 1) // exactly one new row, no cascade
  })
})
```

- [ ] **Step 2: Run the test (should fail)**

```bash
pnpm test tests/integration/audit-extension.spec.ts
```

Expected: FAIL — no audit extension wired.

- [ ] **Step 3: Write lib/db/audit-extension.ts**

```ts
// lib/db/audit-extension.ts
import { Prisma, AuditAction } from '@prisma/client'
import { basePrisma } from './base'
import { tryGetContext } from '@/lib/context'

// Pluralizes a Prisma model name to the client property name.
// e.g. "User" -> "user", "AuditLog" -> "auditLog"
function modelAccessor(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1)
}

// Fields we never diff (noise + cycles)
const SKIP_FIELDS = new Set(['updatedAt', 'createdAt', 'id'])

function diffRows(before: Record<string, unknown>, after: Record<string, unknown>) {
  const changes: Array<{ field: string; before: unknown; after: unknown }> = []
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const k of keys) {
    if (SKIP_FIELDS.has(k)) continue
    const b = before[k]
    const a = after[k]
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      changes.push({ field: k, before: b, after: a })
    }
  }
  return changes
}

const READ_OPS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findUnique',
  'findUniqueOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
])

export const auditExtension = Prisma.defineExtension({
  name: 'audit-log',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Never audit the audit table itself
        if (model === 'AuditLog') return query(args)
        if (READ_OPS.has(operation)) return query(args)

        const ctx = tryGetContext()
        const a = args as Record<string, any>

        // Snapshot "before" for update/delete
        let beforeRow: Record<string, unknown> | null = null
        if (operation === 'update' || operation === 'delete') {
          const accessor = modelAccessor(model)
          // Use basePrisma to avoid recursive extension calls.
          // Use findFirst (not findUnique) because args.where has already been enriched
          // with exploitantId by the tenant-extension running before us, and findUnique
          // rejects mixed unique+non-unique where clauses.
          beforeRow = await (basePrisma as any)[accessor].findFirst({ where: a.where })
        }

        const result = await query(args)

        const exploitantId = ctx?.exploitantId ?? null
        const userId = ctx?.userId ?? null
        const impersonatedBy = ctx?.impersonatedBy ?? null
        const now = new Date()
        void now // kept for potential future bulk insert

        try {
          if (operation === 'create') {
            const row = result as Record<string, unknown>
            await basePrisma.auditLog.create({
              data: {
                exploitantId,
                userId,
                impersonatedBy,
                entityType: model,
                entityId: String(row.id),
                action: AuditAction.CREATE,
                field: null,
                beforeValue: undefined,
                afterValue: row as any,
              },
            })
          } else if (operation === 'update' && beforeRow) {
            const afterRow = result as Record<string, unknown>
            const changes = diffRows(beforeRow, afterRow)
            if (changes.length > 0) {
              await basePrisma.auditLog.createMany({
                data: changes.map((c) => ({
                  exploitantId,
                  userId,
                  impersonatedBy,
                  entityType: model,
                  entityId: String(afterRow.id),
                  action: AuditAction.UPDATE,
                  field: c.field,
                  beforeValue: c.before as any,
                  afterValue: c.after as any,
                })),
              })
            }
          } else if (operation === 'delete' && beforeRow) {
            await basePrisma.auditLog.create({
              data: {
                exploitantId,
                userId,
                impersonatedBy,
                entityType: model,
                entityId: String(beforeRow.id),
                action: AuditAction.DELETE,
                field: null,
                beforeValue: beforeRow as any,
                afterValue: undefined,
              },
            })
          }
          // createMany / updateMany / deleteMany / upsert: rare + aggregate; deferred to P1 if needed.
        } catch (err) {
          // Audit write failures MUST NOT break the primary operation.
          // Log and continue. In production, Sentry will capture.
          console.error('audit-extension: failed to write audit row', err)
        }

        return result
      },
    },
  },
})
```

- [ ] **Step 4: Wire both extensions into lib/db/index.ts**

Replace `lib/db/index.ts`:

```ts
// lib/db/index.ts
import { basePrisma } from './base'
import { tenantExtension } from './tenant-extension'
import { auditExtension } from './audit-extension'

/** Tenant-scoped Prisma client. Default for 99% of code. */
export const db = basePrisma.$extends(tenantExtension).$extends(auditExtension)

/**
 * Unscoped Prisma client. ONLY importable from lib/admin/** + app/**/admin/**
 * + scripts/** + prisma/seed.ts (enforced by ESLint no-restricted-imports).
 * Still audited.
 */
export const adminDb = basePrisma.$extends(auditExtension)
```

- [ ] **Step 5: Run the test (should pass)**

```bash
pnpm test tests/integration/audit-extension.spec.ts
```

Expected: 5 tests passing.

- [ ] **Step 6: Commit**

```bash
git add lib/db/audit-extension.ts lib/db/index.ts tests/integration/audit-extension.spec.ts
git commit -m "feat(db): audit extension with before/after diffs and impersonation tracking"
```

---

## Task 16: lib/admin/impersonate helper

**Files:**
- Create: `lib/admin/impersonate.ts`, `lib/admin/README.md`
- Test: add to `tests/integration/tenant-isolation.spec.ts`

- [ ] **Step 1: Add failing test to tenant-isolation.spec.ts**

Append to `tests/integration/tenant-isolation.spec.ts`:

```ts
import { impersonate } from '@/lib/admin/impersonate'

describe('impersonate helper', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('runs fn inside target tenant context', async () => {
    const admin = await seedTenant('ADMIN')
    const tenant = await seedTenant('T')

    const result = await asUser({ userId: admin.userId, exploitantId: admin.exploitantId }, 'ADMIN_CALPAX', async () => {
      return impersonate(tenant.exploitantId, async () => {
        const users = await db.user.findMany()
        return users
      })
    })

    const emails = result.map((u) => u.email)
    expect(emails).toContain('user-T@test.local')
    expect(emails).not.toContain('user-ADMIN@test.local')
  })

  it('refuses to impersonate if caller is not ADMIN_CALPAX', async () => {
    const caller = await seedTenant('CALLER')
    const tenant = await seedTenant('T')

    await expect(
      asUser(caller, 'GERANT', async () =>
        impersonate(tenant.exploitantId, async () => db.user.findMany()),
      ),
    ).rejects.toThrow(/ADMIN_CALPAX/)
  })
})
```

- [ ] **Step 2: Run (should fail)**

```bash
pnpm test tests/integration/tenant-isolation.spec.ts
```

Expected: FAIL — `@/lib/admin/impersonate` not found.

- [ ] **Step 3: Write lib/admin/impersonate.ts**

```ts
// lib/admin/impersonate.ts
import { getContext, runWithContext } from '@/lib/context'

/**
 * Run `fn` as if the current ADMIN_CALPAX user were a member of `targetExploitantId`.
 * - Queries inside fn go through the tenant-scoped `db` client and see only the target tenant.
 * - Every audit row written inside fn carries `impersonatedBy = admin.userId`.
 *
 * Throws if the caller is not ADMIN_CALPAX.
 */
export async function impersonate<T>(
  targetExploitantId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const admin = getContext()
  if (admin.role !== 'ADMIN_CALPAX') {
    throw new Error('impersonate() requires ADMIN_CALPAX role')
  }
  return runWithContext(
    {
      userId: admin.userId,
      exploitantId: targetExploitantId,
      role: admin.role,
      impersonatedBy: admin.userId,
    },
    fn,
  ) as Promise<T>
}
```

- [ ] **Step 4: Write lib/admin/README.md**

```markdown
# lib/admin/

This is the **only folder** in the codebase allowed to import `adminDb` from `@/lib/db`.

## Rules
1. `adminDb` is the unscoped Prisma client. It bypasses tenant isolation.
2. Only `lib/admin/**`, `app/**/admin/**`, `scripts/**`, and `prisma/seed.ts` may import it (enforced by `no-restricted-imports` in `eslint.config.mjs`).
3. Every `adminDb` write is still audited (but `exploitantId` may be null if the action is truly cross-tenant).
4. Prefer `impersonate(exploitantId, fn)` over raw `adminDb` when you need to act **as** a tenant — it keeps the audit trail clean.

## Files
- `impersonate.ts` — the escape hatch for "admin acts as tenant" scenarios
```

- [ ] **Step 5: Run tests (should pass)**

```bash
pnpm test tests/integration/tenant-isolation.spec.ts
```

Expected: all tests (previous 5 + 2 new impersonation tests) passing.

- [ ] **Step 6: Commit**

```bash
git add lib/admin/ tests/integration/tenant-isolation.spec.ts
git commit -m "feat(admin): impersonate helper with audit-trail continuity"
```

---

## Task 17: ESLint restriction meta-tests

**Files:**
- Create: `tests/integration/eslint-rules.spec.ts`
- Create: `tests/integration/fixtures/bad-admindb-import.ts`, `tests/integration/fixtures/bad-raw-sql.ts`

- [ ] **Step 1: Create the bad fixtures**

`tests/integration/fixtures/bad-admindb-import.ts`:

```ts
// @ts-nocheck - intentionally bad for eslint test
import { adminDb } from '@/lib/db'

export function bad() {
  return adminDb
}
```

`tests/integration/fixtures/bad-raw-sql.ts`:

```ts
// @ts-nocheck - intentionally bad for eslint test
import { db } from '@/lib/db'

export async function bad() {
  return db.$queryRaw`SELECT 1`
}
```

**Important:** these fixture files live under `tests/` which is ignored by the ESLint restriction rules (see `eslint.config.mjs`), so they won't fail normal lint. The meta-test runs ESLint **pointing at a different config** that does lint them.

- [ ] **Step 2: Write meta-test**

`tests/integration/eslint-rules.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ESLint } from 'eslint'
import path from 'node:path'

// Build a minimal ESLint instance that lints fixtures as if they were regular app files.
async function lintWithRestrictions(file: string) {
  const eslint = new ESLint({
    overrideConfig: [
      {
        files: ['**/*.ts'],
        rules: {
          'no-restricted-imports': [
            'error',
            {
              paths: [
                {
                  name: '@/lib/db',
                  importNames: ['adminDb'],
                  message: 'adminDb can only be imported from lib/admin/** or app/**/admin/**',
                },
              ],
            },
          ],
          'no-restricted-properties': [
            'error',
            { object: 'db', property: '$queryRaw', message: 'raw SQL belongs in lib/db/raw/' },
          ],
        },
      },
    ],
    overrideConfigFile: true,
  })
  const results = await eslint.lintFiles([path.resolve(file)])
  return results[0]
}

describe('eslint restriction rules (meta)', () => {
  it('bans adminDb import from non-whitelisted folders', async () => {
    const result = await lintWithRestrictions(
      'tests/integration/fixtures/bad-admindb-import.ts',
    )
    expect(result?.errorCount).toBeGreaterThan(0)
    expect(result?.messages.some((m) => m.ruleId === 'no-restricted-imports')).toBe(true)
  })

  it('bans $queryRaw on db outside lib/db/raw', async () => {
    const result = await lintWithRestrictions('tests/integration/fixtures/bad-raw-sql.ts')
    expect(result?.errorCount).toBeGreaterThan(0)
    expect(result?.messages.some((m) => m.ruleId === 'no-restricted-properties')).toBe(true)
  })
})
```

- [ ] **Step 3: Run the test**

```bash
pnpm test tests/integration/eslint-rules.spec.ts
```

Expected: 2 tests passing. The ESLint programmatic API runs the rules against the fixture files and confirms they fail.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/eslint-rules.spec.ts tests/integration/fixtures/
git commit -m "test: eslint restriction meta-tests for adminDb + raw SQL rules"
```

---

# Phase E — Auth + i18n + routes

---

## Task 18: Auth.js v5 config + Prisma adapter

**Files:**
- Create: `lib/auth/index.ts`, `app/api/auth/[...nextauth]/route.ts`
- Modify: `lib/auth/requireAuth.ts` (Task 19 will create this)

- [ ] **Step 1: Write lib/auth/index.ts**

```ts
// lib/auth/index.ts
import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Resend from 'next-auth/providers/resend'
import type { UserRole } from '@prisma/client'
import { basePrisma } from '@/lib/db/base'

// Auth.js reads the DB via basePrisma (NOT db) so it can query Users across tenants
// during the sign-in step (before the request context exists).

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      image: string | null
      exploitantId: string
      role: UserRole
    }
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(basePrisma),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM ?? 'no-reply@calpax.fr',
    }),
  ],
  session: { strategy: 'database' },
  pages: {
    signIn: '/fr/auth/signin',
    verifyRequest: '/fr/auth/verify',
  },
  callbacks: {
    async session({ session, user }) {
      // Extend the session with tenant + role read from the DB user
      const dbUser = await basePrisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, email: true, name: true, image: true, exploitantId: true, role: true },
      })
      if (dbUser) {
        session.user = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          image: dbUser.image,
          exploitantId: dbUser.exploitantId,
          role: dbUser.role,
        }
      }
      return session
    },
  },
})
```

- [ ] **Step 2: Write app/api/auth/[...nextauth]/route.ts**

```ts
// app/api/auth/[...nextauth]/route.ts
export { GET, POST } from '@/lib/auth'

// Note: re-export the handlers from lib/auth/index.ts via:
//   export const { handlers: { GET, POST }, ... } — if Auth.js provides them as handlers.GET/POST
// or directly as GET/POST exports. Auth.js v5 exports them as `handlers`.
```

Wait — the above comment conflicts with the actual export. Correct version:

```ts
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors. If `Resend` provider doesn't exist at that import path, try `import EmailProvider from 'next-auth/providers/email'` as the fallback and set its `sendVerificationRequest` manually using the Resend SDK.

- [ ] **Step 4: Commit**

```bash
git add lib/auth/index.ts app/api/auth/
git commit -m "feat(auth): auth.js v5 with prisma adapter and resend email provider"
```

---

## Task 19: requireAuth wrapper

**Files:**
- Create: `lib/auth/requireAuth.ts`

- [ ] **Step 1: Write lib/auth/requireAuth.ts**

```ts
// lib/auth/requireAuth.ts
import { auth } from '@/lib/auth'
import { runWithContext } from '@/lib/context'
import { UnauthorizedError } from '@/lib/errors'

/**
 * Wrap any server component / server action body in this to:
 *  1. require a valid Auth.js session
 *  2. expose `{ userId, exploitantId, role }` to Prisma via AsyncLocalStorage
 *
 * Usage:
 *   export default async function Page() {
 *     return requireAuth(async () => {
 *       const exp = await db.exploitant.findFirstOrThrow()
 *       return <p>{exp.name}</p>
 *     })
 *   }
 */
export async function requireAuth<T>(fn: () => Promise<T>): Promise<T> {
  const session = await auth()
  if (!session?.user) throw new UnauthorizedError()
  return runWithContext(
    {
      userId: session.user.id,
      exploitantId: session.user.exploitantId,
      role: session.user.role,
    },
    fn,
  ) as Promise<T>
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/auth/requireAuth.ts
git commit -m "feat(auth): requireAuth wrapper bridging auth.js session to async context"
```

---

## Task 20: next-intl setup (FR + EN)

**Files:**
- Create: `i18n.ts`, `middleware.ts`, `messages/fr.json`, `messages/en.json`
- Modify: `next.config.ts`

- [ ] **Step 1: Write i18n.ts**

```ts
// i18n.ts
import { getRequestConfig } from 'next-intl/server'
import { notFound } from 'next/navigation'

export const locales = ['fr', 'en'] as const
export const defaultLocale = 'fr' as const
export type Locale = (typeof locales)[number]

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? defaultLocale
  if (!locales.includes(locale as Locale)) notFound()
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
```

- [ ] **Step 2: Write middleware.ts**

```ts
// middleware.ts
import createMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from './i18n'

export default createMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
```

- [ ] **Step 3: Write messages/fr.json**

```json
{
  "home": {
    "signedInAs": "Connecté en tant que {name} — Exploitant {exploitant}",
    "signOut": "Se déconnecter"
  },
  "signin": {
    "title": "Connexion à Calpax",
    "emailLabel": "Adresse email",
    "emailPlaceholder": "vous@exemple.com",
    "submit": "Recevoir un lien de connexion",
    "verifySent": "Vérifiez votre boîte email. Un lien de connexion vous a été envoyé.",
    "verifyTitle": "Lien envoyé"
  },
  "admin": {
    "title": "Calpax — Administration",
    "unauthorized": "Accès réservé"
  },
  "errors": {
    "unauthorized": "Vous devez être connecté pour accéder à cette page."
  }
}
```

- [ ] **Step 4: Write messages/en.json**

```json
{
  "home": {
    "signedInAs": "Signed in as {name} — Operator {exploitant}",
    "signOut": "Sign out"
  },
  "signin": {
    "title": "Sign in to Calpax",
    "emailLabel": "Email address",
    "emailPlaceholder": "you@example.com",
    "submit": "Email me a sign-in link",
    "verifySent": "Check your inbox. A sign-in link has been sent.",
    "verifyTitle": "Link sent"
  },
  "admin": {
    "title": "Calpax — Administration",
    "unauthorized": "Access restricted"
  },
  "errors": {
    "unauthorized": "You must be signed in to access this page."
  }
}
```

- [ ] **Step 5: Update next.config.ts**

```ts
// next.config.ts
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n.ts')

const nextConfig: NextConfig = {
  // no custom config for P0
}

export default withNextIntl(nextConfig)
```

- [ ] **Step 6: Verify dev still runs**

```bash
pnpm dev
```

Open `http://localhost:3000` — expect a redirect to `/fr`. Ctrl+C to stop.

- [ ] **Step 7: Commit**

```bash
git add i18n.ts middleware.ts messages/ next.config.ts
git commit -m "feat(i18n): next-intl setup with fr (default) + en"
```

---

## Task 21: Root layout + locale layout

**Files:**
- Replace: `app/layout.tsx`
- Create: `app/[locale]/layout.tsx`
- Delete: `app/page.tsx` (replaced by `app/[locale]/(app)/page.tsx` in Task 22)

- [ ] **Step 1: Replace app/layout.tsx**

```tsx
// app/layout.tsx
import type { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'Calpax',
  description: 'SaaS de gestion de vols en montgolfière',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
```

- [ ] **Step 2: Create app/[locale]/layout.tsx**

```tsx
// app/[locale]/layout.tsx
import type { ReactNode } from 'react'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales } from '@/i18n'

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(locales, locale)) notFound()
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Delete stock app/page.tsx**

```bash
rm app/page.tsx
```

- [ ] **Step 4: Verify dev runs**

```bash
pnpm dev
```

Open `http://localhost:3000/fr` — expect a blank body (no home page yet, 404 probably). That's expected; Task 22 fills it in.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/\[locale\]/layout.tsx
git rm app/page.tsx
git commit -m "feat(app): root + locale layout with next-intl provider"
```

---

## Task 22: Sign-in page + home page (the P0 demo)

**Files:**
- Create: `app/[locale]/(auth)/signin/page.tsx`
- Create: `app/[locale]/(auth)/verify/page.tsx`
- Create: `app/[locale]/(app)/layout.tsx`
- Create: `app/[locale]/(app)/page.tsx`
- Create: `app/[locale]/(app)/signout/route.ts`

- [ ] **Step 1: Write sign-in page**

`app/[locale]/(auth)/signin/page.tsx`:

```tsx
// app/[locale]/(auth)/signin/page.tsx
import { getTranslations } from 'next-intl/server'
import { signIn } from '@/lib/auth'

export default async function SignInPage() {
  const t = await getTranslations('signin')

  async function submit(formData: FormData) {
    'use server'
    const email = String(formData.get('email') ?? '')
    await signIn('resend', { email, redirectTo: '/' })
  }

  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <h1 className="mb-6 text-2xl font-semibold">{t('title')}</h1>
      <form action={submit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('emailLabel')}</span>
          <input
            type="email"
            name="email"
            required
            placeholder={t('emailPlaceholder')}
            className="w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
        >
          {t('submit')}
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Write verify-request page**

`app/[locale]/(auth)/verify/page.tsx`:

```tsx
// app/[locale]/(auth)/verify/page.tsx
import { getTranslations } from 'next-intl/server'

export default async function VerifyPage() {
  const t = await getTranslations('signin')
  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <h1 className="mb-4 text-2xl font-semibold">{t('verifyTitle')}</h1>
      <p>{t('verifySent')}</p>
    </main>
  )
}
```

- [ ] **Step 3: Write (app) layout with auth guard**

`app/[locale]/(app)/layout.tsx`:

```tsx
// app/[locale]/(app)/layout.tsx
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) {
    redirect('/fr/auth/signin')
  }
  return <>{children}</>
}
```

- [ ] **Step 4: Write the home page (the P0 demo)**

`app/[locale]/(app)/page.tsx`:

```tsx
// app/[locale]/(app)/page.tsx
import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'

export default async function HomePage() {
  const t = await getTranslations('home')

  return requireAuth(async () => {
    const ctx = getContext()
    // findFirst (not findUnique) so the tenant-extension can compose its WHERE filter
    // on top of our explicit id filter without fighting Prisma's unique constraint.
    const [exploitant, user] = await Promise.all([
      db.exploitant.findFirstOrThrow(),
      db.user.findFirstOrThrow({ where: { id: ctx.userId } }),
    ])

    return (
      <main className="mx-auto max-w-2xl px-6 py-24">
        <p className="text-lg">
          {t('signedInAs', { name: user.name ?? user.email, exploitant: exploitant.name })}
        </p>
        <form action="/fr/signout" method="post" className="mt-6">
          <button
            type="submit"
            className="rounded border border-slate-300 px-4 py-2 hover:bg-slate-100"
          >
            {t('signOut')}
          </button>
        </form>
      </main>
    )
  })
}
```

- [ ] **Step 5: Write sign-out route handler**

`app/[locale]/(app)/signout/route.ts`:

```ts
// app/[locale]/(app)/signout/route.ts
import { signOut } from '@/lib/auth'

export async function POST() {
  await signOut({ redirectTo: '/fr/auth/signin' })
}
```

- [ ] **Step 6: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/\[locale\]/\(auth\) app/\[locale\]/\(app\)
git commit -m "feat(app): sign-in page + home page p0 demo + sign-out"
```

---

## Task 23: Admin route scaffold

**Files:**
- Create: `app/[locale]/admin/layout.tsx`, `app/[locale]/admin/page.tsx`

- [ ] **Step 1: Write admin layout (ADMIN_CALPAX gate)**

`app/[locale]/admin/layout.tsx`:

```tsx
// app/[locale]/admin/layout.tsx
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN_CALPAX') {
    redirect('/fr')
  }
  return <div className="mx-auto max-w-4xl px-6 py-12">{children}</div>
}
```

- [ ] **Step 2: Write admin home page**

`app/[locale]/admin/page.tsx`:

```tsx
// app/[locale]/admin/page.tsx
import { getTranslations } from 'next-intl/server'

export default async function AdminHome() {
  const t = await getTranslations('admin')
  return (
    <main>
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <p className="mt-4 text-slate-600">Admin scaffold — tenant management lives here.</p>
    </main>
  )
}
```

- [ ] **Step 3: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/admin/
git commit -m "feat(app): admin route scaffold with ADMIN_CALPAX gate"
```

---

# Phase F — Tests + CI

---

## Task 24: Full local test pass + README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Run all tests locally**

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
```

Expected:
- typecheck: no errors
- lint: no errors
- unit tests: crypto (7) + context (5) + sanity (1) = 13 passing
- integration tests: tenant-isolation (8, incl. 2 impersonation) + audit-extension (5) + eslint-rules (2) = 15 passing

Fix anything red.

- [ ] **Step 2: Write README.md**

```markdown
# Calpax v2

Multi-tenant SaaS for commercial hot-air balloon operators.

**Current phase:** P0 Foundation (see `docs/superpowers/plans/2026-04-10-p0-foundation.md`)
**Roadmap:** `docs/superpowers/specs/2026-04-09-calpax-roadmap-decomposition.md`

## Local development

### Prerequisites
- Node 22 LTS
- pnpm 9+
- Docker Desktop (for local Supabase)
- Supabase CLI (`brew install supabase/tap/supabase`)

### First-time setup
```bash
pnpm install
supabase start                  # spin up local postgres + studio
cp .env.example .env            # fill in placeholders; crypto key + auth secret below
echo "AUTH_SECRET=\"$(openssl rand -base64 32)\"" >> .env
echo "ENCRYPTION_KEY=\"$(openssl rand -hex 32)\"" >> .env
pnpm exec prisma migrate dev    # apply schema
pnpm exec prisma db seed        # create Cameron Balloons + users
pnpm dev                        # http://localhost:3000
```

### Daily dev
```bash
supabase start    # if not already running
pnpm dev
```

### Tests
```bash
pnpm test                 # unit tests (vitest, no DB)
pnpm test:integration     # integration tests (vitest + supabase)
pnpm test:e2e             # Playwright E2E (requires running dev server)
pnpm typecheck
pnpm lint
```

### Adding a new tenanted entity in P1+

1. Add the model to `prisma/schema.prisma` with an `exploitantId String` field and `@@index([exploitantId])`.
2. In `lib/db/tenant-extension.ts`, add the model name to `TENANT_FILTER`:
   ```ts
   export const TENANT_FILTER: Record<string, string> = {
     Exploitant: 'id',
     User: 'exploitantId',
     AuditLog: 'exploitantId',
     Ballon: 'exploitantId',    // <-- add here
   }
   ```
3. Run `pnpm exec prisma migrate dev --name add_ballon`.
4. Write integration tests using `seedTenant` + `asUser` helpers in `tests/integration/helpers.ts`.

Unknown models throw at query time — `tenant-extension` fails closed if a model is not classified.

## Architecture

- `app/[locale]/` — next-intl-routed pages
- `lib/context.ts` — `AsyncLocalStorage` request context (carries userId + exploitantId)
- `lib/db/tenant-extension.ts` — Prisma extension injecting `WHERE exploitantId = ctx.exploitantId`
- `lib/db/audit-extension.ts` — Prisma extension writing every mutation to `audit_log`
- `lib/db/index.ts` — exports `db` (scoped) and `adminDb` (unscoped, ESLint-restricted to `lib/admin/**`)
- `lib/admin/impersonate.ts` — the only way for ADMIN_CALPAX to act as a tenant

See `docs/superpowers/specs/2026-04-10-p0-foundation-design.md` for full design rationale.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: readme with local setup + tenant entity guide"
```

---

## Task 25: Playwright E2E smoke test

**Files:**
- Create: `tests/e2e/smoke.spec.ts`, `tests/e2e/helpers.ts`

- [ ] **Step 1: Write E2E helpers for magic link extraction**

`tests/e2e/helpers.ts`:

```ts
// tests/e2e/helpers.ts
import { basePrisma } from '@/lib/db/base'

/**
 * Wait for a VerificationToken row for `email`, return the sign-in URL.
 * Works against Supabase local — the Auth.js Resend provider writes the token
 * row BEFORE sending the email via Resend, so we can read it straight from the DB.
 */
export async function waitForMagicLink(
  email: string,
  baseUrl: string,
  timeoutMs = 10_000,
): Promise<string> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const row = await basePrisma.verificationToken.findFirst({
      where: { identifier: email },
      orderBy: { expires: 'desc' },
    })
    if (row) {
      // Auth.js constructs the callback URL as /api/auth/callback/resend?token=...&email=...
      const params = new URLSearchParams({ token: row.token, email })
      return `${baseUrl}/api/auth/callback/resend?${params.toString()}`
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`no VerificationToken found for ${email} within ${timeoutMs}ms`)
}
```

- [ ] **Step 2: Write the smoke test**

`tests/e2e/smoke.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { waitForMagicLink } from './helpers'

const OLIVIER = 'olivier@cameronfrance.com'

test('P0 demo: sign in as Olivier and see home page', async ({ page, baseURL }) => {
  // 1. Visit root -> expect redirect to /fr
  await page.goto('/')
  await expect(page).toHaveURL(/\/fr(\/|$)/)

  // 2. Since unauth, should be pushed to signin
  await expect(page).toHaveURL(/\/fr\/auth\/signin/)

  // 3. Fill email and submit
  await page.fill('input[name="email"]', OLIVIER)
  await page.click('button[type="submit"]')

  // 4. Verify-request page
  await expect(page).toHaveURL(/\/fr\/auth\/verify/)
  await expect(page.getByText(/Vérifiez votre boîte email/i)).toBeVisible()

  // 5. Grab the magic link from the DB and follow it
  const link = await waitForMagicLink(OLIVIER, baseURL ?? 'http://localhost:3000')
  await page.goto(link)

  // 6. Land on /fr and see the demo text
  await expect(page).toHaveURL(/\/fr\/?$/)
  await expect(
    page.getByText(
      /Connecté en tant que Olivier Cuenot — Exploitant Cameron Balloons France/,
    ),
  ).toBeVisible()
})
```

- [ ] **Step 3: Run locally**

Prerequisite: `supabase start`, `pnpm dev` in another terminal, and `pnpm exec prisma db seed` already run.

```bash
pnpm exec playwright test tests/e2e/smoke.spec.ts --headed
```

Expected: the browser walks through the full flow, test passes. If the Resend provider tries to actually send an email (no `RESEND_API_KEY` locally), that's fine — Auth.js still writes the `VerificationToken` row first, which is all the test needs. If it errors hard, set `RESEND_API_KEY` to any non-empty string.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/
git commit -m "test(e2e): playwright smoke test for full p0 demo flow"
```

---

## Task 26: GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-type-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test

  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - uses: supabase/setup-cli@v1
        with: { version: latest }
      - run: pnpm install --frozen-lockfile
      - name: Start local Supabase
        run: supabase start
      - name: Apply migrations
        env:
          DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
          DIRECT_URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
        run: pnpm exec prisma migrate deploy
      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
          DIRECT_URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
          ENCRYPTION_KEY: ${{ secrets.ENCRYPTION_KEY_TEST }}
          AUTH_SECRET: ${{ secrets.AUTH_SECRET_TEST }}
        run: pnpm test:integration
      - name: Stop Supabase
        if: always()
        run: supabase stop

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - name: Build
        env:
          DATABASE_URL: postgresql://user:pass@127.0.0.1:5432/db
          DIRECT_URL: postgresql://user:pass@127.0.0.1:5432/db
          AUTH_SECRET: ${{ secrets.AUTH_SECRET_TEST }}
          ENCRYPTION_KEY: ${{ secrets.ENCRYPTION_KEY_TEST }}
          RESEND_API_KEY: dummy
          EMAIL_FROM: no-reply@calpax.fr
        run: pnpm exec prisma generate && pnpm build

  e2e-staging:
    if: github.ref == 'refs/heads/main'
    needs: [lint-type-unit, integration, build]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install chromium --with-deps
      - name: Wait for Vercel staging deployment
        run: |
          echo "Vercel auto-deploys on merge to main; this step assumes staging is ready."
          sleep 60
      - name: Run E2E against staging
        env:
          E2E_BASE_URL: https://staging.calpax.fr
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
        run: pnpm test:e2e
```

- [ ] **Step 2: Add required GitHub secrets**

At `https://github.com/Calpax-aaS/calpax-v2/settings/secrets/actions`, add:

- `AUTH_SECRET_TEST` — `openssl rand -base64 32`
- `ENCRYPTION_KEY_TEST` — `openssl rand -hex 32`
- `STAGING_DATABASE_URL` — staging Supabase connection string (added in Task 27)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: github actions pipeline (lint/type/unit, integration, build, e2e-staging)"
```

---

# Phase G — Provisioning + deploy + exit gate

---

## Task 27: Provision Supabase prod + staging projects

**Files:** none (manual work with dashboard)

- [ ] **Step 1: Create Supabase org**

Open `https://supabase.com/dashboard`, sign up, create organization `Calpax`.

- [ ] **Step 2: Create the prod project**

- Name: `calpax-v2-prod`
- Region: `eu-west-3` (Paris)
- Plan: Free
- DB password: generate strong, store in 1Password

- [ ] **Step 3: Create the staging project**

- Name: `calpax-v2-staging`
- Region: `eu-west-3` (Paris)
- Plan: Free
- DB password: generate strong, store in 1Password

- [ ] **Step 4: Collect connection strings**

For each project, from `Project Settings → Database → Connection string`:

- `DATABASE_URL` (Transaction pooler, port 6543, for runtime)
- `DIRECT_URL` (Session mode, port 5432, for Prisma migrations)

Store in 1Password labeled `calpax-v2-prod-db` and `calpax-v2-staging-db`.

- [ ] **Step 5: Apply migrations to both**

```bash
# Staging
DATABASE_URL=<staging direct url> DIRECT_URL=<staging direct url> pnpm exec prisma migrate deploy

# Prod
DATABASE_URL=<prod direct url> DIRECT_URL=<prod direct url> pnpm exec prisma migrate deploy
```

Expected: migrations applied. Verify in Supabase Studio → Table Editor — 6 tables visible.

- [ ] **Step 6: Seed both environments**

```bash
DATABASE_URL=<staging> DIRECT_URL=<staging> pnpm exec prisma db seed
DATABASE_URL=<prod> DIRECT_URL=<prod> pnpm exec prisma db seed
```

Expected: 2 exploitants + 2 users in each.

- [ ] **Step 7: Record as done**

No commit — these steps are dashboard clicks.

---

## Task 28: Provision Resend + Sentry + Vercel

**Files:** `vercel.json` (optional; env via dashboard works too)

- [ ] **Step 1: Resend**

- Sign up at `https://resend.com`, free tier
- Add domain `calpax.fr`
- Copy the DNS records (SPF, DKIM, DMARC) and add them at your domain registrar
- Wait for verification (5-15 min)
- Create an API key named `calpax-v2-prod`, store in 1Password

- [ ] **Step 2: Sentry**

- Sign up at `https://sentry.io`, free tier
- Create org `calpax`
- Create project `calpax-v2`, platform Next.js
- Copy DSN, store in 1Password

- [ ] **Step 3: Vercel account + import repo**

- Sign up at `https://vercel.com` with GitHub
- Import `Calpax-aaS/calpax-v2`
- Framework preset: Next.js (auto-detected)
- Root directory: `./`
- Override Install Command: `pnpm install --frozen-lockfile`
- Override Build Command: `pnpm exec prisma generate && pnpm build`
- Do NOT deploy yet — env vars first

- [ ] **Step 4: Configure Vercel env vars — Production (calpax.fr)**

In Project Settings → Environment Variables → Production:

| Variable | Value |
|---|---|
| `DATABASE_URL` | prod Supabase pooled URL |
| `DIRECT_URL` | prod Supabase direct URL |
| `AUTH_SECRET` | `openssl rand -base64 32` (new, prod-only) |
| `AUTH_URL` | `https://calpax.fr` |
| `RESEND_API_KEY` | from Resend |
| `EMAIL_FROM` | `no-reply@calpax.fr` |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` (new, prod-only — NEVER rotate without migration) |
| `SENTRY_DSN` | from Sentry |
| `SENTRY_AUTH_TOKEN` | from Sentry, for source map upload |

- [ ] **Step 5: Configure Vercel env vars — Preview + Development**

Same variables, but:
- `DATABASE_URL` / `DIRECT_URL` → staging Supabase
- `AUTH_URL` → the Vercel preview base URL (`$VERCEL_URL` placeholder or per-branch)
- `ENCRYPTION_KEY` → a separate key (not the prod key)

- [ ] **Step 6: Add domains to Vercel**

- Add `calpax.fr` (assigned to production)
- Add `www.calpax.fr` (redirect to apex)
- Add `staging.calpax.fr` (assigned to the `main` branch's preview deployment — Vercel supports "production branch" + aliased subdomain for staging via the `Git → Production Branch` + domain assignment pattern; if not, use a `staging` branch)

- [ ] **Step 7: Update DNS**

At the `calpax.fr` registrar, add:

- `A` record `@` → Vercel's apex IP (from Vercel's domain config)
- `CNAME` record `www` → `cname.vercel-dns.com`
- `CNAME` record `staging` → `cname.vercel-dns.com`

Wait for DNS propagation (up to 1h).

- [ ] **Step 8: Record as done**

No commit.

---

## Task 29: First deploy + verify each environment

**Files:** none

- [ ] **Step 1: Push main + trigger first deploy**

```bash
git push origin main
```

Vercel builds and deploys to the preview URL automatically.

- [ ] **Step 2: Verify staging**

Open `https://staging.calpax.fr`. Expect redirect to `/fr/auth/signin`.

Sign in with `olivier@cameronfrance.com`. Check Resend dashboard for the email. Click the magic link.

Expect: lands on `/fr`, renders `Connecté en tant que Olivier Cuenot — Exploitant Cameron Balloons France`.

- [ ] **Step 3: Verify production**

Once staging is verified, Vercel's production branch auto-promotes (or manually promote via Vercel dashboard).

Open `https://calpax.fr`. Repeat the sign-in flow. Expect identical result.

- [ ] **Step 4: Verify admin route**

Sign out. Sign in with `damien@calpax.fr`. Navigate to `/fr/admin`. Expect the admin scaffold page renders. Sign out, sign in as Olivier, navigate to `/fr/admin` — expect redirect to `/fr`.

- [ ] **Step 5: Trigger a Sentry test error**

Add a temporary route `app/[locale]/_test-sentry/page.tsx`:

```tsx
export default function TestSentry() {
  throw new Error('Sentry wiring test — intentional')
}
```

Deploy, hit `https://staging.calpax.fr/fr/_test-sentry`, verify the error appears in Sentry within 1 min. Delete the file, commit, push.

- [ ] **Step 6: Commit Sentry verification cleanup**

```bash
git rm app/\[locale\]/_test-sentry/page.tsx
git commit -m "chore: remove sentry wiring test page after verification"
git push
```

---

## Task 30: P0 exit criteria verification

**Files:** none (checklist)

- [ ] **Verify each exit criterion from the spec**

Walk through `docs/superpowers/specs/2026-04-10-p0-foundation-design.md` §11 and check each box:

- [ ] Supabase prod + staging in `eu-west-3`; both reachable
- [ ] Resend domain verified with SPF/DKIM/DMARC green
- [ ] `calpax.fr` serves HTTPS; `staging.calpax.fr` serves HTTPS
- [ ] Sentry received a test error from prod (removed after)
- [ ] Prisma schema migrated to prod + staging (6 tables each)
- [ ] Seed idempotent on both (Calpax SAS, Cameron Balloons, Olivier, Damien)
- [ ] Tenant isolation tests green (§10.1 — 5 tests)
- [ ] Audit extension tests green (§10.2 — 5 tests)
- [ ] Crypto tests green (§10.3 — 7 tests)
- [ ] ESLint meta-tests green (§10.4 — 2 tests)
- [ ] E2E smoke green locally + on `staging.calpax.fr` + canary on `calpax.fr`
- [ ] CI green on `main` for 3 consecutive commits
- [ ] Same P0 demo works at `/fr` and `/en` (sign out, switch URL to `/en/auth/signin`, sign in, land on `/en`, verify English text renders)
- [ ] `README.md` up to date (setup, tests, "how to add a tenanted entity")

- [ ] **Update roadmap spec with completion date**

Edit `docs/superpowers/specs/2026-04-09-calpax-roadmap-decomposition.md` in the P0 section, add: `**Completed:** <YYYY-MM-DD>`.

- [ ] **Final commit + push**

```bash
git add docs/superpowers/specs/2026-04-09-calpax-roadmap-decomposition.md
git commit -m "docs: mark p0 foundation as complete"
git push
```

- [ ] **Announce P0 done**

P0 is complete. Next phase: brainstorm P1 (Regulatory back-office — Exploitant profile, Ballon performance chart, Pilote BFCL, CAMO alerts, RGPD v1) through the same spec → plan → implementation cycle.
