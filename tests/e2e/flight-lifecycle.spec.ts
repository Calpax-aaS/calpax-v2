/**
 * E2E test -- Flight lifecycle using seeded data
 *
 * Uses existing seed data (Cameron Balloons pilotes + ballons + billets)
 * instead of creating new entities. Tests the real operational workflow.
 *
 * Flow:
 *  1. Sign in with email+password
 *  2. Verify pilotes and ballons exist
 *  3. Navigate planning, billets, RGPD, audit pages
 */
import { test, expect } from '@playwright/test'
import { ensureSeedData } from './helpers'

const TEST_EMAIL = 'olivier@cameronfrance.com'
const TEST_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? 'calpax2026!'
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

test.beforeAll(async () => {
  await ensureSeedData()
})

async function signIn(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/fr/auth/signin`)
  await page.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL)
  await page.getByLabel(/mot de passe|password/i).fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /se connecter|sign in/i }).click()

  // Wait for either a successful redirect or an error message
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

  if (!page.url().includes('/fr')) {
    await page.goto(`${BASE_URL}/fr`)
  }
}

test.describe.serial('Flight lifecycle E2E', () => {
  test('sign in and see dashboard', async ({ page }) => {
    await signIn(page)
    await expect(page.getByRole('heading', { name: /tableau de bord/i })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText(/Cameron Balloons/i)).toBeVisible()
  })

  test('pilotes list shows seeded data', async ({ page }) => {
    await signIn(page)
    await page.goto('/fr/pilotes')
    await expect(page.getByText('Olivier')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Cuenot')).toBeVisible()
  })

  test('ballons list shows seeded data', async ({ page }) => {
    await signIn(page)
    await page.goto('/fr/ballons')
    await expect(page.getByText('F-HFCC').first()).toBeVisible({ timeout: 10_000 })
  })

  test('billets list shows seeded data', async ({ page }) => {
    await signIn(page)
    await page.goto('/fr/billets')
    await expect(page.getByText('CBF-2026-0001')).toBeVisible({ timeout: 10_000 })
  })

  test('planning shows week navigation', async ({ page }) => {
    await signIn(page)
    await page.goto('/fr/vols')
    await expect(page.getByText(/Planning des vols/)).toBeVisible({ timeout: 10_000 })
    await page.getByText(String.fromCharCode(8594)).click()
    await page.waitForTimeout(1000)
    await page.getByText(String.fromCharCode(8592)).click()
    await page.waitForTimeout(1000)
    await page.getByText(/aujourd.hui|today/i).click()
    await expect(page.getByText(/Planning des vols/)).toBeVisible()
  })

  test('RGPD page loads', async ({ page }) => {
    await signIn(page)
    await page.goto('/fr/rgpd')
    await expect(page.getByRole('heading', { name: /RGPD|GDPR/ })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole('button', { name: /rechercher/i })).toBeVisible()
  })

  test('audit trail loads', async ({ page }) => {
    await signIn(page)
    await page.goto('/fr/audit')
    await expect(page.getByText(/Journal des modifications/)).toBeVisible({ timeout: 10_000 })
  })
})
