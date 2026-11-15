import { expect, test } from '@playwright/test'

// Demo mode: no Supabase env, so the router lets every page through and the
// data comes from src/api.js mock seeds. Any page that throws shows up as a
// console error here.
const routes = [
  '/',
  '/user',
  '/user/dashboard',
  '/user/report',
  '/user/comment',
  '/user/conversation',
  '/user/contact',
  '/user/assistant',
  '/user/automation',
  '/user/account',
  '/user/setting',
  '/user/setting/profile',
  '/user/setting/session',
  '/user/setting/activity',
  '/user/setting/twofactor',
  '/user/setting/transaction',
  '/user/setting/notification',
  '/user/setting/ai',
  '/user/setting/api',
  '/user/setting/developer',
  '/user/setting/webhook',
  '/user/setting/tikwm',
  '/user/setting/redeem',
  '/user/setting/connected-app',
]

function watchConsole(page) {
  const errors = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  return errors
}

test.describe('demo mode', () => {
  for (const route of routes) {
    test(`${route} renders without console errors`, async ({ page }) => {
      const errors = watchConsole(page)
      const response = await page.goto(route)
      expect(response.status()).toBeLessThan(400)
      await expect(page.locator('body')).toBeVisible()
      await page.waitForLoadState('networkidle')
      expect(errors).toEqual([])
    })
  }

  test('the sidebar navigates between pages', async ({ page }) => {
    await page.goto('/user/setting/ai')
    await page.getByText(/komentar|comment/i).first().click()
    await expect(page).toHaveURL(/\/user\/(comment|conversation|contact)/)
  })

  test('anonymous visitors land on the public page, not a bare login form', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/$/)
    // The public page must say who runs the service and what it does.
    await expect(page.locator('h1')).toContainText(/komentar dan DM Instagram|Instagram comments and DMs/i)
    await expect(page.getByRole('link', { name: /privasi|privacy/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /ketentuan|terms/i })).toBeVisible()
  })

  test('privacy, terms and data deletion pages are public and readable', async ({ page }) => {
    for (const path of ['/privacy', '/terms', '/data-deletion']) {
      await page.goto(path)
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.getByText(/danubudiarto88@gmail\.com/).first()).toBeVisible()
    }
  })

  test('the dashboard shows real counters, not placeholders', async ({ page }) => {
    await page.goto('/user/dashboard')
    await page.waitForLoadState('networkidle')
    // Six cards, each with a number rendered from src/api.js demo data.
    const values = page.locator('.tabular-nums')
    await expect(values).toHaveCount(6)
    for (const text of await values.allInnerTexts()) {
      expect(text.trim()).toMatch(/^\d[\d.,]*%?$/)
    }
  })

  test('demo mode still shows every settings page', async ({ page }) => {
    await page.goto('/user/setting')
    const links = page.locator('nav a[href^="/user/setting/"]')
    await expect(links).toHaveCount(13)
  })

  test('a conversation can be read and answered in demo mode', async ({ page }) => {
    await page.goto('/user/conversation')
    await page.waitForLoadState('networkidle')
    const box = page.getByPlaceholder(/tulis pesan|write a message/i)
    await expect(box).toBeVisible()
    await box.fill('Halo dari uji e2e')
    await page.getByRole('button', { name: /^kirim$|^send$/i }).click()
    // The text shows up twice: in the thread bubble and in the list snippet.
    await expect(page.locator('section p.whitespace-pre-wrap', { hasText: 'Halo dari uji e2e' })).toBeVisible()
  })

  test('a conversation older than 24 hours cannot be answered', async ({ page }) => {
    await page.goto('/user/conversation')
    await page.waitForLoadState('networkidle')
    await page.getByText('budi.santoso').first().click()
    await expect(page.getByText(/jendela balas 24 jam|24-hour reply window/i)).toBeVisible()
    await expect(page.getByPlaceholder(/tulis pesan|write a message/i)).toBeDisabled()
  })

  test('no horizontal scroll on a phone-sized viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    for (const route of ['/user/comment', '/user/setting/ai', '/user/account']) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `${route} overflows horizontally`).toBeLessThanOrEqual(1)
    }
  })
})
