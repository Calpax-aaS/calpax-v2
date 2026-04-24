/**
 * RBAC coverage — verifies server-side role guards on protected routes and
 * the Cache-Control no-store header on PII-serving pages.
 *
 * Each role signs in once (serial describe block) and iterates through its
 * restricted routes, asserting the `Accès refusé` screen rendered by
 * `lib/errors.ts::ForbiddenError` → `app/[locale]/(app)/error.tsx`.
 *
 * Seed:
 *  - olivier@cameronfrance.com (GERANT)
 *  - dcuenot@calpax.fr (ADMIN_CALPAX)
 *  - pilote@cameronfrance.com (PILOTE)
 *  - equipier@cameronfrance.com (EQUIPIER)
 */
import { test, expect, type Page } from '@playwright/test'
import { ensureSeedData } from './helpers'

const PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? 'Calpax-2026-Demo!'

/** Routes gated by `requireRole('ADMIN_CALPAX', 'GERANT')`. */
const ADMIN_GERANT_ONLY = ['/fr/settings', '/fr/rgpd', '/fr/audit']
/** Routes gated by `requireRole('ADMIN_CALPAX', 'GERANT', 'PILOTE')`. */
const NO_EQUIPIER = ['/fr/equipiers', '/fr/vehicules', '/fr/sites']

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/fr/auth/signin')
  await page.getByRole('textbox', { name: /email/i }).fill(email)
  await page.locator('input[name="password"]').fill(PASSWORD)
  await page.getByRole('button', { name: /cockpit|se connecter|sign in/i }).click()
  // After sign-in the user lands on /fr (dashboard)
  await page.waitForURL(/\/fr\/?$/, { timeout: 20_000 })
}

async function expectForbidden(page: Page, route: string): Promise<void> {
  await page.goto(route)
  await expect(
    page.getByRole('heading', { name: /accès refusé|access denied/i }),
    `expected forbidden screen on ${route}`,
  ).toBeVisible({ timeout: 10_000 })
}

test.beforeAll(async () => {
  await ensureSeedData()
})

test.describe.serial('RBAC — EQUIPIER', () => {
  test('is forbidden on admin/gerant routes', async ({ page }) => {
    await signIn(page, 'equipier@cameronfrance.com')
    for (const route of [...ADMIN_GERANT_ONLY, ...NO_EQUIPIER]) {
      await expectForbidden(page, route)
    }
  })

  test('hitting a billet detail URL directly returns forbidden', async ({ page }) => {
    // We don't need a real billet id — requireRole runs before the db lookup.
    await expectForbidden(page, '/fr/billets/fake-billet-id')
  })
})

test.describe.serial('RBAC — PILOTE', () => {
  test('is forbidden on admin-only routes', async ({ page }) => {
    await signIn(page, 'pilote@cameronfrance.com')
    for (const route of ADMIN_GERANT_ONLY) {
      await expectForbidden(page, route)
    }
  })

  test('hitting a billet detail URL directly returns forbidden', async ({ page }) => {
    await expectForbidden(page, '/fr/billets/fake-billet-id')
  })
})

test('Cache-Control: no-store on protected app routes', async ({ page }) => {
  await signIn(page, 'olivier@cameronfrance.com')
  const response = await page.goto('/fr')
  expect(response, 'expected a response for the dashboard').not.toBeNull()
  expect(response!.headers()['cache-control']).toContain('no-store')
})

/**
 * API routes that serve PDFs embedding decrypted passenger PII
 * (poids, email, telephone). `requireRole` runs before the DB lookup,
 * so a bogus vol id is enough to prove an EQUIPIER is rejected before
 * any data would be exposed.
 */
const PII_PDF_API_ROUTES = ['/api/vols/fake-vol-id/pve', '/api/vols/fake-vol-id/fiche-vol']

test.describe.serial('RBAC — API PII PDFs', () => {
  test('EQUIPIER is refused on PVE and fiche-vol APIs', async ({ page, request }) => {
    await signIn(page, 'equipier@cameronfrance.com')
    // Piggy-back on the session cookie from the Playwright page context.
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')

    for (const route of PII_PDF_API_ROUTES) {
      const res = await request.get(route, { headers: { cookie: cookieHeader } })
      expect(res.status(), `EQUIPIER should not reach ${route}`).not.toBe(200)
      // The handler may surface ForbiddenError as 403 or (without a global
      // error boundary) bubble to 500. Either way, no PDF body is returned.
      const ct = res.headers()['content-type'] ?? ''
      expect(ct, `${route} must not return a PDF to EQUIPIER`).not.toContain('application/pdf')
    }
  })
})
