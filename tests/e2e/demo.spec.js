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
