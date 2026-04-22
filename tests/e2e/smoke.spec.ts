/**
 * P0 smoke test -- verifies the full sign-in flow end-to-end.
 *
 * Single test to avoid Better Auth rate limiting. All assertions share
 * one signin in a single browser context.
 */
import { test, expect } from '@playwright/test'
import { ensureSeedData } from './helpers'

const TEST_EMAIL = 'olivier@cameronfrance.com'
const TEST_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? 'Calpax-2026-Demo!'

test.beforeAll(async () => {
  await ensureSeedData()
})

test('P0 smoke -- full sign-in flow', async ({ page }) => {
  // Unauthenticated root redirects to sign-in
  await page.goto('/fr')
  await expect(page).toHaveURL(/\/fr\/auth\/signin/, { timeout: 10_000 })
  await expect(
    page.getByRole('heading', { name: /revoir|welcome|connexion|sign in/i }),
  ).toBeVisible()

  // Sign-in form shows email and password inputs
  await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
  await expect(page.locator('input[name="password"]')).toBeVisible()
  await expect(page.getByRole('button', { name: /cockpit|se connecter|sign in/i })).toBeVisible()

  // Fill and submit
  await page.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL)
  await page.locator('input[name="password"]').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /cockpit|se connecter|sign in/i }).click()

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
