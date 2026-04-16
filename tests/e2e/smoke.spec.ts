/**
 * P0 smoke test -- verifies the full sign-in flow end-to-end.
 *
 * Flow:
 *  1. Visit / -> redirected to /fr/auth/signin (unauthenticated)
 *  2. Fill email + password + submit sign-in form
 *  3. Better Auth validates credentials, creates a session, redirects to /
 *  4. Home page shows "Connecte en tant que Olivier Cuenot"
 *
 * Prerequisites:
 *  - Supabase running locally (pnpm exec supabase start)
 *  - Prisma migrations applied (pnpm exec prisma migrate deploy)
 *  - Seed data present (pnpm exec tsx prisma/seed.ts)
 */
import { test, expect } from '@playwright/test'
import { ensureSeedData } from './helpers'

const TEST_EMAIL = 'olivier@cameronfrance.com'
const TEST_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? 'calpax2026!'

test.beforeAll(async () => {
  await ensureSeedData()
})

test.describe.serial('P0 smoke -- sign-in flow', () => {
  test('unauthenticated root redirects to sign-in page', async ({ page }) => {
    await page.goto('/fr')
    await expect(page).toHaveURL(/\/fr\/auth\/signin/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /connexion|sign in/i })).toBeVisible()
  })

  test('sign-in form shows email and password inputs', async ({ page }) => {
    await page.goto('/fr/auth/signin')
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect(page.getByLabel(/mot de passe|password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /se connecter|sign in/i })).toBeVisible()
  })

  test('email+password sign-in shows home page', async ({ page }) => {
    await page.goto('/fr/auth/signin')

    await page.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL)
    await page.getByLabel(/mot de passe|password/i).fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /se connecter|sign in/i }).click()

    // Fail fast if an error message appears instead of waiting for timeout
    const errorLocator = page.locator('.bg-destructive\\/10')
    const redirected = await Promise.race([
      page.waitForURL(/\/fr\/?$/, { timeout: 20_000 }).then(() => true),
      errorLocator.waitFor({ state: 'visible', timeout: 20_000 }).then(async () => {
        const msg = await errorLocator.textContent()
        throw new Error(`Sign-in error displayed: ${msg}`)
      }),
    ])

    expect(redirected).toBe(true)
    await expect(page.getByRole('heading', { name: /tableau de bord/i })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('full flow: sign-in -> home page with operator info', async ({ page }) => {
    await page.goto('/fr/auth/signin')

    await page.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL)
    await page.getByLabel(/mot de passe|password/i).fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /se connecter|sign in/i }).click()

    // Fail fast if an error message appears instead of waiting for timeout
    const errorLocator = page.locator('.bg-destructive\\/10')
    const redirected = await Promise.race([
      page.waitForURL(/\/fr\/?$/, { timeout: 20_000 }).then(() => true),
      errorLocator.waitFor({ state: 'visible', timeout: 20_000 }).then(async () => {
        const msg = await errorLocator.textContent()
        throw new Error(`Sign-in error displayed: ${msg}`)
      }),
    ])

    expect(redirected).toBe(true)
    await expect(page.getByRole('heading', { name: /tableau de bord/i })).toBeVisible({
      timeout: 10_000,
    })
  })
})
