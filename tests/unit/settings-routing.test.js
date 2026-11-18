import { describe, expect, it, vi } from 'vitest'
import { settingItems, visibleSettingItems } from '../../src/menu.js'

// Exercise Vue Router's actual path matcher without a browser or Supabase.
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, createWebHistory: actual.createMemoryHistory }
})

async function loadRouter(authEnabled) {
  vi.resetModules()
  vi.doMock('../../src/auth', () => ({ authEnabled, authReady: Promise.resolve(), session: { value: authEnabled ? { user: {} } : null } }))
  return (await import('../../src/router.js')).default
}

describe('direct settings URLs', () => {
  it('resolves hidden settings to the localized placeholder, not the demo component', async () => {
    const router = await loadRouter(true)
    const visible = visibleSettingItems(true)
    for (const item of settingItems) {
      const expected = visible.includes(item) ? `user-setting-${item.key}` : 'user-placeholder'
      expect(router.resolve(`${item.path}/?source=bookmark#section`).name, item.path).toBe(expected)
    }
    expect(router.resolve('/user/setting').name).toBe('user-setting')
  })

  it('retains every original settings page in developer demo mode', async () => {
    const router = await loadRouter(false)
    for (const item of settingItems) {
      expect(router.resolve(item.path).name, item.path).toBe(`user-setting-${item.key}`)
    }
  })
})
