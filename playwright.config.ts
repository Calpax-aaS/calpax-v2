import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

// Load .env so that AUTH_SECRET and DATABASE_URL are available to the test
// process without having to pass them manually on the command line.
config({ path: '.env' })

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
        // Use the sign-in page (public, no auth required) as the health check URL
        url: `${BASE_URL}/fr/auth/signin`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
