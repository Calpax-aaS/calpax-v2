# P1: Better Auth Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace NextAuth (beta) with Better Auth for email+password, magic link, and Google OAuth authentication, with built-in middleware auth and rate limiting.

**Architecture:** Install better-auth, configure server + client, create API route handler, update middleware for auth guard, adapt requireAuth/getContext to read Better Auth sessions, migrate Prisma schema (rename old tables, let Better Auth create new ones, migrate data), update login page UI, update tests.

**Tech Stack:** better-auth, @better-auth/prisma-adapter, Prisma, Next.js 15 App Router, Resend (for magic link emails)

**Spec:** `docs/superpowers/specs/2026-04-15-better-auth-migration-design.md`

**IMPORTANT:** Better Auth's API may have evolved since this plan was written. Before implementing each task, check the official docs at https://www.better-auth.com/docs for exact import paths and API signatures. The library uses sub-path exports that change between minor versions.

---

## File Map

### New files

| File                             | Responsibility                                           |
| -------------------------------- | -------------------------------------------------------- |
| `lib/auth.ts`                    | Better Auth server config (replaces `lib/auth/index.ts`) |
| `lib/auth-client.ts`             | Better Auth client-side auth client                      |
| `app/api/auth/[...all]/route.ts` | Better Auth catch-all API handler                        |

### Modified files

| File                                  | Change                                                          |
| ------------------------------------- | --------------------------------------------------------------- |
| `prisma/schema.prisma`                | Add Better Auth tables, keep custom fields (role, exploitantId) |
| `lib/auth/requireAuth.ts`             | Read session from Better Auth instead of NextAuth               |
| `middleware.ts`                       | Add auth guard for `/(app)/` routes                             |
| `app/[locale]/auth/signin/page.tsx`   | Add email+password form + Google OAuth button                   |
| `app/[locale]/(app)/signout/route.ts` | Use Better Auth signOut                                         |
| `app/[locale]/(app)/layout.tsx`       | Use Better Auth session                                         |
| `tests/e2e/helpers.ts`                | Adapt auth helpers for Better Auth                              |
| `tests/integration/helpers.ts`        | Adapt test helpers                                              |
| `prisma/seed.ts`                      | Create users via Better Auth                                    |
| `package.json`                        | Remove next-auth, add better-auth                               |
| `.env.example`                        | Update env var names                                            |
| `.github/workflows/ci.yml`            | Update env vars in CI                                           |

### Deleted files

| File                                  | Reason                                       |
| ------------------------------------- | -------------------------------------------- |
| `lib/auth/index.ts`                   | Replaced by `lib/auth.ts`                    |
| `app/api/auth/[...nextauth]/route.ts` | Replaced by `app/api/auth/[...all]/route.ts` |

---

## Task 1: Install Better Auth and update dependencies

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install better-auth**

```bash
pnpm add better-auth
```

- [ ] **Step 2: Remove NextAuth packages**

```bash
pnpm remove next-auth @auth/prisma-adapter
```

- [ ] **Step 3: Verify no import errors yet (build will fail -- that's expected)**

Don't build yet. Just verify the packages are installed:

```bash
pnpm ls better-auth
```

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: replace next-auth with better-auth dependency"
```

---

## Task 2: Create Better Auth server configuration

**Files:**

- Create: `lib/auth.ts`
- Delete: `lib/auth/index.ts`

- [ ] **Step 1: Read the current `lib/auth/index.ts` to understand the session enrichment logic**

Note the key behavior: the session callback enriches the session with `exploitantId` and `role` from the database User record.

- [ ] **Step 2: Create `lib/auth.ts`**

```ts
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin } from 'better-auth/plugins'
import { basePrisma } from '@/lib/db/base'
import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
const resend =
  resendApiKey && resendApiKey !== 'resend-key-not-configured' ? new Resend(resendApiKey) : null

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  database: prismaAdapter(basePrisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      if (!resend) return
      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? 'Calpax <noreply@calpax.fr>',
        to: user.email,
        subject: 'Vérifiez votre email — Calpax',
        html: `<p>Cliquez sur ce lien pour vérifier votre email :</p><p><a href="${url}">${url}</a></p>`,
      })
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'GERANT',
        input: false,
      },
      exploitantId: {
        type: 'string',
        required: true,
        input: false,
      },
    },
  },
  plugins: [admin()],
})

export type Session = typeof auth.$Infer.Session
```

NOTE: The exact API for `betterAuth()`, `prismaAdapter`, plugins, and `user.additionalFields` may differ from the latest docs. Check https://www.better-auth.com/docs/installation and https://www.better-auth.com/docs/concepts/database before implementing. If `prismaAdapter` is imported from a different path (e.g., `@better-auth/prisma-adapter`), adjust accordingly.

- [ ] **Step 3: Delete `lib/auth/index.ts`**

```bash
rm lib/auth/index.ts
```

- [ ] **Step 4: Commit**

```bash
git add lib/auth.ts
git rm lib/auth/index.ts
git commit -m "feat(auth): create Better Auth server configuration"
```

---

## Task 3: Create Better Auth client and API route

**Files:**

- Create: `lib/auth-client.ts`
- Create: `app/api/auth/[...all]/route.ts`
- Delete: `app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create `lib/auth-client.ts`**

```ts
import { createAuthClient } from 'better-auth/react'
import { adminClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  plugins: [adminClient()],
})

export const { signIn, signOut, signUp, useSession } = authClient
```

NOTE: Check the exact import path for `createAuthClient`. It might be `better-auth/client` or `better-auth/react` depending on the version.

- [ ] **Step 2: Create API route handler**

Create `app/api/auth/[...all]/route.ts`:

```ts
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

- [ ] **Step 3: Delete old NextAuth route**

```bash
rm -rf app/api/auth/\[...nextauth\]
```

- [ ] **Step 4: Commit**

```bash
git add lib/auth-client.ts "app/api/auth/[...all]/route.ts"
git rm -r "app/api/auth/[...nextauth]"
git commit -m "feat(auth): create Better Auth client and API route handler"
```

---

## Task 4: Update Prisma schema for Better Auth

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Generate the Better Auth schema additions**

Run the Better Auth CLI to see what tables/fields it needs:

```bash
npx @better-auth/cli generate
```

This will output the required Prisma models. Review the output.

- [ ] **Step 2: Update the Prisma schema**

Better Auth needs specific table structures. Update `prisma/schema.prisma`:

- Keep the `User` model but ensure it has the fields Better Auth expects (`email`, `name`, `emailVerified`, `image`, `createdAt`, `updatedAt`)
- Add Better Auth's required fields to `User` if missing (e.g., `password` for email+password auth)
- Keep our custom fields (`role`, `exploitantId`)
- Replace the NextAuth `Account`, `Session`, `VerificationToken` models with Better Auth's versions
- Better Auth uses different field names and structures -- follow the CLI output exactly

Key differences to expect:

- `Session` model: Better Auth uses `token` (not `sessionToken`), `expiresAt` (not `expires`), and adds `ipAddress`, `userAgent`
- `Account` model: Better Auth uses `providerId`, `accountId` instead of `provider`, `providerAccountId`
- `Verification` model: Better Auth uses `identifier`, `value`, `expiresAt`
- `User` model: Better Auth may add a `password` field for email+password auth

- [ ] **Step 3: Create the migration**

```bash
npx prisma migrate dev --name better-auth-migration
```

This will generate the migration SQL. Review it to ensure:

- Our custom fields (`role`, `exploitantId`, FK to `Exploitant`) are preserved
- The old NextAuth tables are dropped/renamed
- Better Auth tables are created

- [ ] **Step 4: Verify the migration applies cleanly**

```bash
npx prisma migrate reset --force
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(auth): update Prisma schema for Better Auth tables"
```

---

## Task 5: Update requireAuth and context

**Files:**

- Modify: `lib/auth/requireAuth.ts`
- Modify: `lib/context.ts`

- [ ] **Step 1: Update `requireAuth.ts`**

```ts
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { runWithContext } from '@/lib/context'
import { UnauthorizedError } from '@/lib/errors'
import type { UserRole } from '@/lib/context'

export async function requireAuth<T>(fn: () => Promise<T>): Promise<T> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) throw new UnauthorizedError()

  const exploitantId = (session.user as Record<string, unknown>).exploitantId as string
  const role = (session.user as Record<string, unknown>).role as string

  if (!exploitantId) throw new UnauthorizedError('User has no exploitant')

  return runWithContext(
    {
      userId: session.user.id,
      exploitantId,
      role: role as UserRole,
    },
    fn,
  ) as Promise<T>
}
```

NOTE: The way to access custom user fields (`role`, `exploitantId`) depends on how Better Auth exposes `additionalFields`. Check the docs. If Better Auth types the session correctly, the `as Record<string, unknown>` casts can be removed.

- [ ] **Step 2: Context stays the same**

`lib/context.ts` does not need changes -- it's independent of the auth library. The `UserRole` type and `RequestContext` remain identical.

- [ ] **Step 3: Commit**

```bash
git add lib/auth/requireAuth.ts
git commit -m "feat(auth): adapt requireAuth to read Better Auth sessions"
```

---

## Task 6: Update middleware with auth guard

**Files:**

- Modify: `middleware.ts`

- [ ] **Step 1: Read the current middleware**

It currently only does i18n routing via `next-intl`.

- [ ] **Step 2: Add auth guard**

```ts
import { NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { auth } from '@/lib/auth'

const intlMiddleware = createIntlMiddleware(routing)

export default async function middleware(request: NextRequest) {
  // Run i18n middleware first
  const intlResponse = intlMiddleware(request)

  // Check if route requires auth (/(app)/ routes)
  const pathname = request.nextUrl.pathname
  const isAppRoute = /^\/[a-z]{2}\/(?!auth)/.test(pathname)
  const isApiAuth = pathname.startsWith('/api/auth')

  if (isAppRoute && !isApiAuth) {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      const locale = pathname.split('/')[1] || 'fr'
      return NextResponse.redirect(new URL(`/${locale}/auth/signin`, request.url))
    }
  }

  return intlResponse
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
```

NOTE: Better Auth needs its API routes (`/api/auth/*`) to be excluded from the middleware auth check. Also verify that `auth.api.getSession({ headers: request.headers })` works in middleware context (Edge Runtime). If it doesn't, use Better Auth's dedicated middleware helper if available.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(auth): add auth guard in middleware (resolves TD-011)"
```

---

## Task 7: Update app layout

**Files:**

- Modify: `app/[locale]/(app)/layout.tsx`

- [ ] **Step 1: Read the current layout**

It calls `auth()` from NextAuth to get the session, then redirects if no user.

- [ ] **Step 2: Update to use Better Auth**

Replace the NextAuth `auth()` call with Better Auth's `auth.api.getSession()`:

```ts
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
```

Replace:

```ts
const session = await auth()
if (!session?.user) redirect(...)
```

With:

```ts
const session = await auth.api.getSession({ headers: await headers() })
if (!session?.user) redirect(`/${locale}/auth/signin`)
```

Access custom fields via the session user object. The `exploitantId` and `role` should be available as additional fields.

Update the `runWithContext` call to use the new session structure.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(app)/layout.tsx"
git commit -m "feat(auth): update app layout to use Better Auth session"
```

---

## Task 8: Redesign login page for email+password + magic link + Google

**Files:**

- Modify: `app/[locale]/auth/signin/page.tsx`
- Modify: `messages/fr.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add i18n keys**

In `messages/fr.json` `signin` section, add:

```json
"passwordLabel": "Mot de passe",
"passwordPlaceholder": "Votre mot de passe",
"forgotPassword": "Mot de passe oublié ?",
"sendMagicLink": "Recevoir un lien magique",
"orContinueWith": "Ou continuer avec",
"google": "Google",
"noAccount": "Pas encore de compte ?",
"createAccount": "Créer un compte"
```

Add EN equivalents.

- [ ] **Step 2: Rewrite the signin page as a client component**

The page needs to use Better Auth's client-side `signIn` methods. Convert to a client component:

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { signIn } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
```

The form should have:

1. Email field
2. Password field
3. "Connexion" button (email+password sign in)
4. "Mot de passe oublié ?" link (triggers magic link flow)
5. "Ou continuer avec" divider
6. Google OAuth button (only shown if GOOGLE_CLIENT_ID is configured)

Use the existing split-screen layout from the current page (left branding panel, right form).

Sign-in calls:

- Email+password: `await signIn.email({ email, password })`
- Magic link: `await signIn.magicLink({ email })`
- Google: `await signIn.social({ provider: 'google' })`

NOTE: Check Better Auth client docs for exact method signatures. They may be `authClient.signIn.email()` or `signIn.emailAndPassword()` depending on version.

- [ ] **Step 3: Build and verify**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/auth/signin/page.tsx" messages/fr.json messages/en.json
git commit -m "feat(auth): redesign login page with email+password, magic link, and Google OAuth"
```

---

## Task 9: Update signout route

**Files:**

- Modify: `app/[locale]/(app)/signout/route.ts`

- [ ] **Step 1: Update to use Better Auth**

```ts
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  await auth.api.signOut({
    headers: req.headers,
  })

  return NextResponse.redirect(new URL(`/${locale}/auth/signin`, req.url))
}
```

NOTE: Check the Better Auth server-side signout API. It might be `auth.api.revokeSession()` or similar. The client-side `signOut()` from `auth-client.ts` can also be used from client components.

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(app)/signout/route.ts"
git commit -m "feat(auth): update signout to use Better Auth"
```

---

## Task 10: Update seed script

**Files:**

- Modify: `prisma/seed.ts`

- [ ] **Step 1: Read the current seed script**

It creates users via Prisma directly. With Better Auth, we should either:

- Continue creating users via Prisma (adding a hashed password field)
- Use Better Auth's server-side API to create users

For seed data, direct Prisma inserts with a pre-hashed password is simplest:

```ts
import { hash } from 'better-auth/crypto' // or bcrypt

const hashedPassword = await hash('initial-password-change-me')

await prisma.user.upsert({
  where: { email: 'olivier@cameronfrance.com' },
  update: {},
  create: {
    email: 'olivier@cameronfrance.com',
    name: 'Olivier Cuenot',
    role: 'GERANT',
    exploitantId: cameronBalloons.id,
    password: hashedPassword,
  },
})
```

NOTE: Check how Better Auth stores passwords. It may use its own hashing utility or expect bcrypt. The field name might be `hashedPassword` instead of `password`. Check the schema generated in Task 4.

- [ ] **Step 2: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(auth): update seed script for Better Auth user creation"
```

---

## Task 11: Update E2E and integration test helpers

**Files:**

- Modify: `tests/e2e/helpers.ts`
- Modify: `tests/integration/helpers.ts`

- [ ] **Step 1: Update E2E helpers**

The current `createMagicLink` function creates a `VerificationToken` row matching NextAuth's hashing scheme. With Better Auth, the table and hashing are different.

Option A: Use Better Auth's server-side API to create a test session directly
Option B: Use email+password login in E2E tests (simpler -- just POST to the signin endpoint)

Recommended: Option B. In E2E tests, sign in via email+password by navigating to the login page and filling the form. This is more realistic and doesn't depend on internal token formats.

Update `ensureSeedData()` to create users with passwords (matching the seed script pattern).

- [ ] **Step 2: Update integration test helpers**

The `asUser` helper in `tests/integration/helpers.ts` uses `runWithContext` directly -- this is independent of the auth library and should continue to work. Verify by running integration tests.

- [ ] **Step 3: Run all tests**

```bash
npm test
pnpm test:integration
```

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/helpers.ts tests/integration/helpers.ts
git commit -m "feat(auth): update test helpers for Better Auth"
```

---

## Task 12: Update environment variables

**Files:**

- Modify: `.env.example`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Update `.env.example`**

Replace:

```
AUTH_SECRET=
AUTH_URL=
```

With:

```
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

- [ ] **Step 2: Update CI workflow env vars**

In `.github/workflows/ci.yml`, replace all references to `AUTH_SECRET` and `AUTH_URL` with `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`. Check every job that sets these env vars.

- [ ] **Step 3: Update Vercel env vars**

This is a manual step -- update on Vercel dashboard:

- Add `BETTER_AUTH_SECRET` (generate with `openssl rand -base64 32`)
- Add `BETTER_AUTH_URL` (https://www.calpax.fr)
- Add `NEXT_PUBLIC_APP_URL` (https://www.calpax.fr)
- Remove `AUTH_SECRET` and `AUTH_URL` after deployment is verified
- Optionally add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

- [ ] **Step 4: Commit**

```bash
git add .env.example .github/workflows/ci.yml
git commit -m "chore(auth): update env vars for Better Auth"
```

---

## Task 13: Final verification and cleanup

- [ ] **Step 1: Grep for remaining NextAuth references**

```bash
grep -rn "next-auth\|NextAuth\|@auth/prisma-adapter\|AUTH_SECRET\b\|AUTH_URL\b" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.yml" .
```

Fix any remaining references.

- [ ] **Step 2: Full build**

```bash
npm run build
```

- [ ] **Step 3: Run all tests**

```bash
npm test
pnpm test:integration
```

- [ ] **Step 4: Manual verification**

1. Open signin page -- verify email+password form renders
2. Sign in with email+password
3. Verify dashboard loads with correct user data
4. Verify sidebar shows correct role
5. Click "Déconnexion" -- verify redirect to signin
6. Test magic link flow (if Resend is configured)

- [ ] **Step 5: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore(auth): final Better Auth migration cleanup"
```

---

## Notes for the implementer

1. **Better Auth evolves fast.** Import paths and API signatures may differ from this plan. Always check https://www.better-auth.com/docs before implementing each task.

2. **The Prisma schema task (Task 4) is the most critical.** The migration SQL must preserve our `exploitantId` FK, `role` enum, and all related data. Review the generated migration carefully before applying.

3. **The `user.additionalFields` config (Task 2) is how we add `role` and `exploitantId` to Better Auth's User model.** If this API doesn't exist in the current version, the alternative is to add these fields directly in the Prisma schema and configure Better Auth to use the existing table.

4. **Don't delete the old `lib/auth/index.ts` until the new `lib/auth.ts` is working.** Tasks 2-3 can be done in parallel preparation, but the switch should be atomic.

5. **After migration, update `docs/TECH_DEBT.md`** to mark TD-007, TD-011, TD-013, and LOW-001 as resolved.
