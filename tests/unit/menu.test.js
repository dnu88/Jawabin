import { describe, expect, it } from 'vitest'
import { mockSettingKeys, settingItems, visibleSettingItems } from '../../src/menu.js'

describe('setting menu', () => {
  it('keeps every entry unique and under /user/setting/', () => {
    expect(new Set(settingItems.map((item) => item.key)).size).toBe(settingItems.length)
    expect(new Set(settingItems.map((item) => item.path)).size).toBe(settingItems.length)
    for (const item of settingItems) {
      expect(item.path.startsWith('/user/setting/')).toBe(true)
      expect(['account', 'preference', 'integration']).toContain(item.group)
    }
  })

  it('lists every mock key in the real menu (guards against typos)', () => {
    const keys = new Set(settingItems.map((item) => item.key))
    for (const key of mockSettingKeys) expect(keys.has(key), key).toBe(true)
  })

  it('shows the whole menu in demo mode', () => {
    expect(visibleSettingItems(false)).toHaveLength(settingItems.length)
  })

  it('hides the unwired pages once a real session is active', () => {
    const visible = visibleSettingItems(true)
    expect(visible.map((item) => item.key)).toEqual(['profile', 'activity', 'notification', 'ai'])
    for (const key of mockSettingKeys) {
      expect(visible.some((item) => item.key == key), key).toBe(false)
    }
  })

  it('never hides the AI settings page, which is wired to the server', () => {
    expect(visibleSettingItems(true).some((item) => item.key == 'ai')).toBe(true)
  })
})
