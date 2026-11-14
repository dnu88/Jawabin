import { defineConfig } from '@playwright/test'

const port = 5178

// Runs against the demo build (no Supabase env), so no login is involved.
// Set PLAYWRIGHT_CHANNEL=chrome to reuse a locally installed Chrome instead of
// downloading a browser.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  fullyParallel: true,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
