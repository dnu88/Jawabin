import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ current: null, filters: [], writeError: null, reloadError: null, missing: false }))
vi.mock('../../server/db.js', () => ({
  db: () => ({ from: () => {
    let update
    const filters = []
    const query = {
      update: value => { update = value; return query },
      eq: (key, value) => { filters.push([key, value]); return query },
      select: () => {
        if (!update) return query
        state.filters = filters
        if (state.writeError) return Promise.resolve({ error: state.writeError })
        const matched = filters.every(([key, value]) => state.current[key] === value)
        if (matched) Object.assign(state.current, update)
        return Promise.resolve({ data: matched ? [{ ...state.current }] : [], error: null })
      },
      maybeSingle: async () => ({ data: state.missing ? null : { ...state.current }, error: state.reloadError }),
    }
    return query
  } }),
  check: ({ data, error }) => { if (error) throw Error(error.message); return data },
}))
import { encrypt, decrypt } from '../../server/crypto.js'
import { accountToken, sendMessage } from '../../server/instagram.js'
let account
beforeEach(() => {
  account = { id: 'acc-1', user_id: 'owner', platform_user_id: '101', auth_mode: 'instagram_login', access_token_encrypted: encrypt('mock-old'), token_expires_at: new Date(Date.now() + 86400000).toISOString() }
  state.current = { ...account }; state.filters = []; state.writeError = null; state.reloadError = null; state.missing = false
})
afterEach(() => vi.unstubAllGlobals())
const response = (body, status = 200) => new Response(JSON.stringify(body), { status })
it('CAS refresh matches original family and ciphertext and updates in-memory account', async () => {
  const original = account.access_token_encrypted
  vi.stubGlobal('fetch', vi.fn(async () => response({ access_token: 'mock-fresh', expires_in: 5184000 })))
  await expect(accountToken(account)).resolves.toBe('mock-fresh')
  expect(state.filters).toContainEqual(['auth_mode', 'instagram_login'])
  expect(state.filters).toContainEqual(['access_token_encrypted', original])
  expect(decrypt(state.current.access_token_encrypted)).toBe('mock-fresh')
  expect(account.access_token_encrypted).toBe(state.current.access_token_encrypted)
})
it('delayed legacy refresh cannot overwrite unified token; reload changes message host and bearer', async () => {
  const original = account.access_token_encrypted
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    if (String(url).includes('refresh_access_token')) {
      state.current = { ...state.current, auth_mode: 'unified_login', access_token_encrypted: encrypt('mock-suat'), token_expires_at: null }
      return response({ access_token: 'mock-stale-refresh', expires_in: 5184000 })
    }
    expect(String(url)).toBe('https://graph.facebook.com/v27.0/101/messages')
    expect(options.headers.authorization).toBe('Bearer mock-suat')
    return response({ message_id: 'mock-mid' })
  }))
  await expect(sendMessage(account, 'customer', 'mock')).resolves.toEqual({ message_id: 'mock-mid' })
  expect(state.filters).toContainEqual(['access_token_encrypted', original])
  expect(decrypt(state.current.access_token_encrypted)).toBe('mock-suat')
  expect(account.auth_mode).toBe('unified_login')
  expect(fetch).toHaveBeenCalledTimes(2)
})
it('CAS miss after another legacy refresh returns active token, not stale refresh result', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => {
    state.current.access_token_encrypted = encrypt('mock-other-refresh')
    return response({ access_token: 'mock-loser', expires_in: 5184000 })
  }))
  await expect(accountToken(account)).resolves.toBe('mock-other-refresh')
})
it('surfaces persistence failure instead of returning an unpersisted fresh token', async () => {
  state.writeError = { message: 'sensitive database details' }
  vi.stubGlobal('fetch', vi.fn(async () => response({ access_token: 'mock-fresh', expires_in: 5184000 })))
  await expect(sendMessage(account, 'customer', 'mock')).rejects.toThrow(/could not be saved/)
  expect(fetch).toHaveBeenCalledTimes(1)
})
it('preserves legacy provider-failure fallback only after checking the active stored account', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => response({}, 502)))
  await expect(accountToken(account)).resolves.toBe('mock-old')
  state.reloadError = { message: 'sensitive details' }
  await expect(accountToken(account)).rejects.toThrow(/could not be loaded/)
})
it('CAS miss with deleted account fails closed, without sending', async () => {
  state.missing = true
  vi.stubGlobal('fetch', vi.fn(async () => {
    state.current.access_token_encrypted = encrypt('mock-new')
    return response({ access_token: 'mock-fresh', expires_in: 5184000 })
  }))
  await expect(sendMessage(account, 'customer', 'mock')).rejects.toThrow(/connect again/)
  expect(fetch).toHaveBeenCalledTimes(1)
})
