/**
 * E2E test -- Flight lifecycle using seeded data
 *
 * Signs in ONCE via beforeAll to avoid rate limiting, then all tests
 * share the authenticated context via storageState.
 *
 * Flow:
 *  1. Sign in with email+password (once)
 *  2. Verify pilotes and ballons exist
 *  3. Navigate planning, billets, RGPD, audit pages
 */
import { test, expect, type Page } from '@playwright/test'
import { ensureSeedData } from './helpers'

const TEST_EMAIL = 'olivier@cameronfrance.com'
const TEST_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? 'Calpax-2026-Demo!'
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

async function signIn(page: Page) {
  await page.goto(`${BASE_URL}/fr/auth/signin`)
  await page.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL)
  await page.getByLabel(/mot de passe|password/i).fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /se connecter|sign in/i }).click()

  const result = await Promise.race([
    page.waitForURL(/\/(fr|en)\/?$/, { timeout: 20_000 }).then(() => ({ ok: true as const })),
    page
      .locator('.bg-destructive\\/10')
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(async () => {
        const errorText = await page.locator('.bg-destructive\\/10').textContent()
        return { ok: false as const, error: errorText }
      }),
  ])

  if (!result.ok) {
    throw new Error(`Sign-in failed with error: ${result.error}`)
  }
}

test.describe('Flight lifecycle E2E', () => {
  test.beforeAll(async () => {
    await ensureSeedData()
  })

  // Sign in once, then use the same browser context for all tests
  test.use({ storageState: undefined })

  test('authenticated user can browse seeded data', async ({ page }) => {
    // Sign in once for this entire test
    await signIn(page)

    // Dashboard (jour J)
    await expect(page.getByRole('heading', { name: /vols du jour/i })).toBeVisible({
      timeout: 10_000,
    })

    // Pilotes
    await page.goto(`${BASE_URL}/fr/pilotes`)
    await expect(page.getByText('Olivier').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Cuenot').first()).toBeVisible()

    // Ballons
    await page.goto(`${BASE_URL}/fr/ballons`)
    await expect(page.getByText('F-HFCC').first()).toBeVisible({ timeout: 10_000 })

    // Billets
    await page.goto(`${BASE_URL}/fr/billets`)
    await expect(page.getByText('CBF-2026-0001')).toBeVisible({ timeout: 10_000 })

    // Vols planning
    await page.goto(`${BASE_URL}/fr/vols`)
    await expect(page.getByText(/Planning des vols/)).toBeVisible({ timeout: 10_000 })

    // RGPD
    await page.goto(`${BASE_URL}/fr/rgpd`)
    await expect(page.getByRole('heading', { name: /RGPD|GDPR/ })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole('button', { name: /rechercher/i })).toBeVisible()

    // Audit
    await page.goto(`${BASE_URL}/fr/audit`)
    await expect(page.getByText(/Journal des modifications/)).toBeVisible({ timeout: 10_000 })
  })
})
