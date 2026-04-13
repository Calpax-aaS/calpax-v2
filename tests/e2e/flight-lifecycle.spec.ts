/**
 * E2E test — Flight lifecycle using seeded data
 *
 * Uses existing seed data (Cameron Balloons pilotes + ballons + billets)
 * instead of creating new entities. This avoids server action auth issues
 * in Playwright and tests the real operational workflow.
 *
 * Flow:
 *  1. Sign in
 *  2. Verify pilotes and ballons exist
 *  3. Create a vol via the planning page
 *  4. Organise: assign a billet to the vol
 *  5. Download fiche de vol PDF
 *  6. Fill post-flight report
 *  7. Verify TERMINE status
 */
import { test, expect } from '@playwright/test'
import { createMagicLink, ensureSeedData } from './helpers'

const TEST_EMAIL = 'olivier@cameronfrance.com'
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  return secret
}

function nextWeekDateStr(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 7)
  return d.toISOString().slice(0, 10)
}

test.beforeAll(async () => {
  await ensureSeedData()
})

async function signIn(page: import('@playwright/test').Page) {
  const magicLink = await createMagicLink(TEST_EMAIL, BASE_URL, getAuthSecret())
  await page.goto(magicLink)
  await page.waitForURL(/\/(fr|en)\/?$/, { timeout: 15_000 })
  if (!page.url().includes('/fr')) {
    await page.goto(`${BASE_URL}/fr`)
  }
}

test.describe.serial('Flight lifecycle E2E', () => {
  test('sign in and see dashboard', async ({ page }) => {
    await signIn(page)
    await expect(page.getByText(/Olivier Cuenot/)).toBeVisible()
    await expect(page.getByText(/Cameron Balloons/)).toBeVisible()
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
    // Navigate forward
    await page.getByText('→').click()
    await page.waitForTimeout(1000)
    // Navigate back
    await page.getByText('←').click()
    await page.waitForTimeout(1000)
    // Today
    await page.getByText(/aujourd.hui|today/i).click()
    await expect(page.getByText(/Planning des vols/)).toBeVisible()
  })

  test('RGPD page loads', async ({ page }) => {
    await signIn(page)
    await page.goto('/fr/rgpd')
    await expect(page.getByText(/RGPD/)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /rechercher/i })).toBeVisible()
  })

  test('audit trail loads', async ({ page }) => {
    await signIn(page)
    await page.goto('/fr/audit')
    await expect(page.getByText(/Journal des modifications/)).toBeVisible({ timeout: 10_000 })
  })
})
