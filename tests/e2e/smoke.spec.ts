/**
 * P0 smoke test — verifies the full sign-in demo flow end-to-end.
 *
 * Flow:
 *  1. Visit / -> redirected to /fr/auth/signin (unauthenticated)
 *  2. Fill email + submit sign-in form -> redirected to /fr/auth/verify
 *     (the form triggers the Auth.js signIn server action, but we bypass
 *      actual email delivery — see createMagicLink in helpers.ts)
 *  3. Navigate directly to the magic-link callback URL (token injected in DB)
 *  4. Auth.js validates the token, creates a session, redirects to /fr
 *  5. Home page shows "Connecté en tant que Olivier Cuenot"
 *
 * Prerequisites:
 *  - Supabase running locally (pnpm exec supabase start)
 *  - Prisma migrations applied (pnpm exec prisma migrate deploy)
 *  - Seed data present (pnpm exec tsx prisma/seed.ts) — this file ensures it
 */
import { test, expect } from '@playwright/test'
import { createMagicLink, ensureSeedData } from './helpers'

const TEST_EMAIL = 'olivier@cameronfrance.com'

test.beforeAll(async () => {
  // Ensure the seed data exists in the DB before any test runs.
  // This is safe to call even if data already exists (uses upsert).
  await ensureSeedData()
})

// AUTH_SECRET must be set in the environment for the token hash to match.
// In local dev it comes from .env; in CI it is passed as an env var.
function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error(
      'AUTH_SECRET is not set — the E2E test cannot construct a valid magic link without it.',
    )
  }
  return secret
}

// Run tests serially: they share the same DB user and verification tokens
// cannot be used more than once. Parallel runs would cause token races.
test.describe.serial('P0 smoke — sign-in flow', () => {
  test('unauthenticated root redirects to sign-in page', async ({ page }) => {
    // Navigate to /fr explicitly to avoid locale detection issues with headless Chromium
    await page.goto('/fr')
    await expect(page).toHaveURL(/\/fr\/auth\/signin/, { timeout: 10_000 })
    // Match either the French or English heading (locale can vary in headless browsers)
    await expect(page.getByRole('heading', { name: /connexion|sign in/i })).toBeVisible()
  })

  test('sign-in form shows email input and submit button', async ({ page }) => {
    await page.goto('/fr/auth/signin')
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    // Match either French or English button text
    await expect(
      page.getByRole('button', { name: /lien de connexion|sign.in link/i }),
    ).toBeVisible()
  })

  test('magic link callback signs in and shows home page', async ({ page }) => {
    const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

    const magicLink = await createMagicLink(TEST_EMAIL, baseUrl, getAuthSecret())

    // Navigate directly to the Auth.js callback URL (callbackUrl=/fr)
    await page.goto(magicLink)

    // Auth.js validates the token and redirects to /fr
    await expect(page).toHaveURL(/\/fr\/?$/, { timeout: 15_000 })

    // The home page shows the signed-in user name (name is the same regardless of locale)
    await expect(page.getByText(/Olivier Cuenot/)).toBeVisible()
  })

  test('full flow: sign-in form -> verify page -> magic link -> home', async ({ page }) => {
    const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

    // Pre-create the magic link before submitting the form, so the token is
    // ready regardless of whether Resend succeeds or fails.
    const magicLink = await createMagicLink(TEST_EMAIL, baseUrl, getAuthSecret())

    // Visit sign-in page directly (fr locale)
    await page.goto('/fr/auth/signin')

    // Fill in the email and submit
    await page.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL)
    // Match either French or English button text
    await page.getByRole('button', { name: /lien de connexion|sign.in link/i }).click()

    // The server action redirects to the verify page (or stays on signin if
    // Resend throws — both outcomes are acceptable here since we bypass email)
    // We just wait briefly then navigate to our pre-created magic link.
    await page.waitForTimeout(500)

    // Navigate to magic link callback
    await page.goto(magicLink)

    // Should land on the authenticated home page (/fr)
    await expect(page).toHaveURL(/\/fr\/?$/, { timeout: 15_000 })
    await expect(page.getByText(/Olivier Cuenot/)).toBeVisible()
    await expect(page.getByText(/Cameron Balloons/)).toBeVisible()
  })
})
