import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { encrypt, decrypt } from '../../server/crypto.js'
import { authorizeUrl, connect, accountToken, sendMessage, replyToComment, subscribeAccount } from '../../server/instagram.js'

let calls
const account = { auth_mode: 'unified_login', platform_user_id: '101', access_token_encrypted: encrypt('mock-suat'), token_expires_at: null }
function responses(...items) {
  vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
    calls.push({ url: new URL(url), ...options })
    const item = items.shift()
    if (!item) throw new Error('unexpected request')
    return new Response(JSON.stringify(item.body ?? item), { status: item.status || 200 })
  }))
}
beforeEach(() => {
  calls = []
  vi.stubEnv('INSTAGRAM_LOGIN_MODE', 'unified')
  vi.stubEnv('META_APP_ID', '123')
  vi.stubEnv('META_APP_SECRET', 'mock-meta-secret')
  vi.stubEnv('META_LOGIN_CONFIG_ID', '456')
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

it('uses configuration and signed state, never legacy scopes, and fails closed without configuration', () => {
  const url = new URL(authorizeUrl('https://app.test/callback', 'signed-state'))
  expect(url.origin + url.pathname).toBe('https://www.facebook.com/dialog/oauth')
  expect(Object.fromEntries(url.searchParams)).toMatchObject({ client_id: '123', config_id: '456', state: 'signed-state', response_type: 'code', redirect_uri: 'https://app.test/callback' })
  expect(url.searchParams.has('scope')).toBe(false)
  vi.stubEnv('META_LOGIN_CONFIG_ID', '')
  expect(() => authorizeUrl('https://app.test/callback', 'state')).toThrow(/META_LOGIN_CONFIG_ID/)
})
it('discovers paginated accounts, deduplicates and reads profiles without subscribing', async () => {
  responses({ access_token: 'mock-suat' }, { client_business_id: '999' },
    { data: [{ id: '101', username: 'one' }], paging: { next: 'https://graph.facebook.com/v27.0/me/assigned_instagram_accounts?after=cursor&access_token=mock-suat' } },
    { data: [{ id: '101' }, { id: '102' }] },
    { id: '101', username: 'one', name: 'One' }, { id: '102', username: 'two' })
  const result = await connect('mock-code', 'https://app.test/callback')
  expect(result).toHaveLength(2)
  expect(result[0]).toMatchObject({ platform_user_id: '101', auth_mode: 'unified_login', client_business_id: '999', login_config_id: '456', token_expires_at: null })
  expect(decrypt(result[1].access_token_encrypted)).toBe('mock-suat')
  expect(calls[0].url.pathname).toBe('/v27.0/oauth/access_token')
  expect(calls[0].url.searchParams.get('redirect_uri')).toBe('https://app.test/callback')
  expect(calls[1].url.searchParams.get('fields')).toBe('client_business_id')
  expect(calls.every(c => !c.url.pathname.includes('subscribed_apps'))).toBe(true)
  expect(calls.slice(1).every(c => c.headers.authorization === 'Bearer mock-suat')).toBe(true)
  expect(calls[3].url.searchParams.has('access_token')).toBe(false)
})
it.each(['https://evil.test/steal', 'https://graph.facebook.com/v27.0/other', 'http://graph.facebook.com/v27.0/me/assigned_instagram_accounts'])('rejects unsafe paging %s before sending credentials', async next => {
  responses({ access_token: 'mock-suat' }, { client_business_id: '999' }, { data: [{ id: '101' }], paging: { next } })
  await expect(connect('code', 'https://app.test/callback')).rejects.toThrow(/pagination/)
  expect(calls).toHaveLength(3)
})
it.each([{ data: [] }, {}, { data: [{ id: '../bad' }] }])('rejects empty or invalid account discovery %j', async page => {
  responses({ access_token: 'mock-suat' }, { client_business_id: '999' }, page)
  await expect(connect('code', 'https://app.test/callback')).rejects.toThrow()
})
it('never refreshes SUATs; null expiry is usable but expired/invalid expiry requires reconnect', async () => {
  vi.stubGlobal('fetch', vi.fn())
  await expect(accountToken(account)).resolves.toBe('mock-suat')
  await expect(accountToken({ ...account, token_expires_at: new Date(0).toISOString() })).rejects.toThrow(/connect again/)
  await expect(accountToken({ ...account, token_expires_at: 'invalid' })).rejects.toThrow(/connect again/)
  expect(fetch).not.toHaveBeenCalled()
})
it('selects API host and explicit IG id per account, regardless of global login mode', async () => {
  vi.stubEnv('INSTAGRAM_LOGIN_MODE', '')
  responses({ message_id: 'mid' }, { id: 'reply' })
  await sendMessage(account, 'customer', 'mock message')
  await replyToComment(account, 'comment', 'mock reply')
  expect(calls[0].url.href).toBe('https://graph.facebook.com/v27.0/101/messages')
  expect(calls[1].url.href).toBe('https://graph.facebook.com/v27.0/comment/replies')
})
it('requires subscription readback for this app and required fields', async () => {
  responses({ success: true }, { data: [{ id: '123', subscribed_fields: ['comments', 'messages'] }] })
  await subscribeAccount(account)
  expect(calls.map(c => c.method || 'GET')).toEqual(['POST', 'GET'])
  responses({ success: true }, { data: [{ id: 'different', subscribed_fields: ['comments', 'messages'] }] })
  await expect(subscribeAccount(account)).rejects.toThrow(/subscription/)
})
it('also accepts short-lived future SUATs without legacy refresh', async () => {
  vi.stubGlobal('fetch', vi.fn())
  await expect(accountToken({ ...account, token_expires_at: new Date(Date.now() + 3600000).toISOString() })).resolves.toBe('mock-suat')
  expect(fetch).not.toHaveBeenCalled()
})
it.each([3600, 5184000])('handles configured SUAT expiry %s without inventing 60 days', async expires_in => {
  const start = Date.now()
  responses({ access_token: 'mock-suat', expires_in }, { client_business_id: '999' }, { data: [{ id: '101' }] }, { id: '101', username: 'one' })
  const [result] = await connect('code', 'https://app.test/callback')
  expect(new Date(result.token_expires_at).getTime() - start).toBeGreaterThanOrEqual(expires_in * 1000)
  expect(new Date(result.token_expires_at).getTime() - start).toBeLessThan(expires_in * 1000 + 1000)
})
it.each([{}, { access_token: '' }, { access_token: 'mock-suat', expires_in: -1 }, { access_token: 'mock-suat', expires_in: 0 }, { access_token: 'mock-suat', expires_in: null }])('rejects malformed exchange %j', async response => {
  responses(response)
  await expect(connect('code', 'https://app.test/callback')).rejects.toThrow()
  expect(calls).toHaveLength(1)
})
it('bounds pagination even when the provider continually returns new cursors', async () => {
  responses({ access_token: 'mock-suat' }, { client_business_id: '999' }, ...Array.from({ length: 20 }, (_, i) => ({ data: [{ id: '101' }], paging: { next: `https://graph.facebook.com/v27.0/me/assigned_instagram_accounts?after=${i}` } })))
  await expect(connect('code', 'https://app.test/callback')).rejects.toThrow(/pagination exceeded limit/)
  expect(calls).toHaveLength(22)
})
it('preserves legacy code/long-token exchange without prematurely subscribing', async () => {
  responses({ access_token: 'mock-short' }, { access_token: 'mock-long', expires_in: 5184000 }, { user_id: '101', username: 'old' })
  const [result] = await connect('code', 'https://app.test/callback', 'instagram_login')
  expect(result).toMatchObject({ auth_mode: 'instagram_login', platform_user_id: '101', client_business_id: null, login_config_id: null })
  expect(calls[0].url.href).toBe('https://api.instagram.com/oauth/access_token')
  expect(calls[1].url.searchParams.get('grant_type')).toBe('ig_exchange_token')
  expect(calls[2].url.hostname).toBe('graph.instagram.com')
  expect(calls).toHaveLength(3)
})
it('redacts reflected runtime credentials and tells revoked SUAT clients to reconnect', async () => {
  responses({ status: 400, body: { error: { code: 190, message: 'token mock-suat secret mock-meta-secret https://meta.test/?access_token=mock-suat' } } })
  try { await sendMessage(account, 'customer', 'mock message'); expect.fail('must reject') } catch (error) {
    expect(error.message).toMatch(/190.*connect again/)
    expect(error.message).not.toMatch(/mock-suat|mock-meta-secret|https:/)
  }
  expect(calls).toHaveLength(1)
})
it('fails closed on unknown mode, invalid config IDs and missing Meta secret', () => {
  vi.stubEnv('INSTAGRAM_LOGIN_MODE', 'typo')
  expect(() => authorizeUrl('https://app.test/callback', 'state')).toThrow(/invalid INSTAGRAM_LOGIN_MODE/)
  vi.stubEnv('INSTAGRAM_LOGIN_MODE', 'unified')
  vi.stubEnv('META_LOGIN_CONFIG_ID', 'not-a-number')
  expect(() => authorizeUrl('https://app.test/callback', 'state')).toThrow(/invalid Meta/)
  vi.stubEnv('META_LOGIN_CONFIG_ID', '456')
  vi.stubEnv('META_APP_SECRET', '')
  expect(() => authorizeUrl('https://app.test/callback', 'state')).toThrow(/META_APP_SECRET/)
})
it('does not expose provider secrets or fetch URLs in connection errors', async () => {
  responses({ status: 400, body: { error: { message: 'https://secret.test/?client_secret=mock-meta-secret&access_token=mock-suat' } } })
  await expect(connect('code', 'https://app.test/callback')).rejects.toThrow(/^Instagram connection failed/)
})
