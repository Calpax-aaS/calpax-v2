/**
 * E2E test — Full flight lifecycle
 *
 * Exercises the critical path end-to-end:
 *  1. Sign in via magic link
 *  2. Create a pilote
 *  3. Create a ballon with performance chart
 *  4. Create a billet with 2 passengers
 *  5. Create a vol (flight) for tomorrow morning
 *  6. Organise the vol (assign the billet)
 *  7. Confirm the vol
 *  8. Download fiche de vol PDF
 *  9. Fill post-flight report
 * 10. Verify vol is in TERMINE status
 *
 * This test should run on every deploy to ensure the core workflow is intact.
 *
 * Prerequisites:
 *  - Database with migrations applied
 *  - Seed data present (Cameron Balloons exploitant + user)
 *  - AUTH_SECRET set in environment
 */
import { test, expect } from '@playwright/test'
import { createMagicLink, ensureSeedData } from './helpers'

const TEST_EMAIL = 'olivier@cameronfrance.com'

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  return secret
}

function tomorrowDateStr(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

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

test.describe.serial('Flight lifecycle — full E2E', () => {
  test('sign in', async ({ page }) => {
    await signIn(page)
    await expect(page.getByText(/Olivier Cuenot/)).toBeVisible()
  })

  test('create a pilote', async ({ page }) => {
    await signIn(page)
    await page.goto('/fr/pilotes/new')
    await page.locator('input[name="prenom"]').fill('E2E')
    await page.locator('input[name="nom"]').fill('TestPilote')
    await page.locator('input[name="licenceBfcl"]').fill('BFCL-E2E-001')
    await page.locator('input[name="dateExpirationLicence"]').fill('2027-12-31')
    await page.locator('input[name="poids"]').fill('85')
    await page.locator('input[name="qualificationCommerciale"]').check()
    await page.locator('input[name="classeA"]').check()
    await page.locator('input[name="groupeA1"]').check()
    await page.getByRole('button', { name: /enregistrer|cr[eé]er|save|create/i }).click()
    await expect(page.getByText('E2E TestPilote')).toBeVisible({ timeout: 10_000 })
  })

  test('create a ballon', async ({ page }) => {
    await signIn(page)
    await page.goto('/fr/ballons/new')
    await page.locator('input[name="nom"]').fill('E2E-Ballon')
    await page.locator('input[name="immatriculation"]').fill('F-E2ET')
    await page.locator('input[name="volumeM3"]').fill('3000')
    await page.locator('input[name="nbPassagerMax"]').fill('4')
    await page.locator('input[name="peseeAVide"]').fill('376')
    await page.locator('input[name="configGaz"]').fill('4xCB2990:4x23kg')
    await page.locator('input[name="manexAnnexRef"]').fill('Test Manex')
    await page.locator('input[name="camoExpiryDate"]').fill('2027-12-31')
    // Fill a few performance chart entries
    await page.locator('input[name="chart_10"]').fill('482')
    await page.locator('input[name="chart_20"]').fill('365')
    await page.locator('input[name="chart_30"]').fill('256')
    await page.getByRole('button', { name: /enregistrer|cr[eé]er|save|create/i }).click()
    await expect(page.getByText('E2E-Ballon')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('F-E2ET')).toBeVisible()
  })

  test('create a billet with 2 passengers', async ({ page }) => {
    await signIn(page)
    await page.goto('/fr/billets/new/edit')
    // Payeur
    await page.locator('input[name="payeurPrenom"]').fill('E2E')
    await page.locator('input[name="payeurNom"]').fill('Payeur')
    await page.locator('input[name="payeurEmail"]').fill('e2e@test.com')
    // Montant
    await page.locator('input[name="montantTtc"]').fill('450')
    // First passenger (pre-filled row)
    const rows = page.locator('table tbody tr')
    await rows.nth(0).locator('input').nth(0).fill('Alice')
    await rows.nth(0).locator('input').nth(1).fill('Test')
    await rows.nth(0).locator('input[type="number"]').nth(0).fill('30')
    await rows.nth(0).locator('input[type="number"]').nth(1).fill('65')
    // Add second passenger
    await page.getByRole('button', { name: /passager/i }).click()
    await rows.nth(1).locator('input').nth(0).fill('Bob')
    await rows.nth(1).locator('input').nth(1).fill('Test')
    await rows.nth(1).locator('input[type="number"]').nth(0).fill('35')
    await rows.nth(1).locator('input[type="number"]').nth(1).fill('80')
    // Submit
    await page.getByRole('button', { name: /enregistrer|cr[eé]er|save|create/i }).click()
    // Should redirect to billet detail
    await expect(page.getByText('CBF-')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Alice')).toBeVisible()
    await expect(page.getByText('Bob')).toBeVisible()
  })

  test('create a vol for tomorrow morning', async ({ page }) => {
    await signIn(page)
    const tomorrow = tomorrowDateStr()
    await page.goto(`/fr/vols/create?date=${tomorrow}&creneau=MATIN`)
    // Select the E2E ballon and pilote
    // Select by visible text — find the option containing our test data
    const ballonSelect = page.locator('select[name="ballonId"]')
    const ballonOptions = await ballonSelect.locator('option').allTextContents()
    const ballonValue = await ballonSelect
      .locator('option', { hasText: 'E2E-Ballon' })
      .getAttribute('value')
    if (ballonValue) await ballonSelect.selectOption(ballonValue)

    const piloteSelect = page.locator('select[name="piloteId"]')
    const piloteValue = await piloteSelect
      .locator('option', { hasText: 'E2E TestPilote' })
      .getAttribute('value')
    if (piloteValue) await piloteSelect.selectOption(piloteValue)
    await page.getByRole('button', { name: /nouveau vol|enregistrer/i }).click()
    // Should redirect to vol detail
    await expect(page.getByText('E2E-Ballon')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('E2E TestPilote')).toBeVisible()
    await expect(page.getByText(/planifi/i)).toBeVisible()
  })

  test('organise vol — assign billet', async ({ page }) => {
    await signIn(page)
    const tomorrow = tomorrowDateStr()
    await page.goto(`/fr/vols?week=${tomorrow}`)
    // Click on the E2E vol card
    await page.getByText('E2E-Ballon').click()
    // Go to organiser
    await page.getByText(/organiser/i).click()
    await expect(page.getByText(/organisation/i)).toBeVisible({ timeout: 10_000 })
    // Should see the billet with Alice and Bob in available billets
    await expect(page.getByText('E2E Payeur')).toBeVisible()
    // Click assign button
    await page
      .getByRole('button', { name: /affecter/i })
      .first()
      .click()
    // Passengers should appear in the assigned section
    await expect(page.getByText('Alice')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Bob')).toBeVisible()
  })

  test('confirm the vol', async ({ page }) => {
    await signIn(page)
    const tomorrow = tomorrowDateStr()
    await page.goto(`/fr/vols?week=${tomorrow}`)
    await page.getByText('E2E-Ballon').click()
    await page.getByRole('button', { name: /confirmer/i }).click()
    await expect(page.getByText(/confirm/i)).toBeVisible({ timeout: 10_000 })
  })

  test('download fiche de vol PDF', async ({ page }) => {
    await signIn(page)
    const tomorrow = tomorrowDateStr()
    await page.goto(`/fr/vols?week=${tomorrow}`)
    await page.getByText('E2E-Ballon').click()
    // Click download link
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByText(/telecharger fiche/i).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/fiche-vol.*\.pdf/)
  })

  test('fill post-flight report', async ({ page }) => {
    await signIn(page)
    const tomorrow = tomorrowDateStr()
    await page.goto(`/fr/vols?week=${tomorrow}`)
    await page.getByText('E2E-Ballon').click()
    await page.getByText(/saisie post-vol/i).click()
    await expect(page.getByText(/compte-rendu/i)).toBeVisible({ timeout: 10_000 })
    // Fill post-flight form
    await page.locator('input[name="decoLieu"]').fill('Dole-Tavaux')
    await page.locator('input[name="decoHeure"]').fill('2026-04-12T06:30')
    await page.locator('input[name="atterLieu"]').fill('Parcey')
    await page.locator('input[name="atterHeure"]').fill('2026-04-12T07:45')
    await page.locator('input[name="gasConso"]').fill('55')
    await page.locator('input[name="distance"]').fill('12')
    await page.getByRole('button', { name: /enregistrer|cr[eé]er|save|create/i }).click()
    // Should redirect to vol detail with TERMINE status
    await expect(page.getByText(/termin/i)).toBeVisible({ timeout: 10_000 })
  })
})
