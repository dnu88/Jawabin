import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { encrypt } from '../../server/crypto.js'

// The account-level webhook subscription is the only part of the delivery chain
// that can be read from the server, so this check has to be right: it is what
// turns "Meta never called us" into a visible reason, and it repairs the
// subscription when Meta really has none.
const state = vi.hoisted(() => ({ inserts: [], cached: [], cacheError: null, insertError: null, queried: [] }))

vi.mock('../../server/db.js', () => ({
  db: () => ({
    from: (table) => {
      const query = {
        table,
        select: () => query,
        eq: () => query,
        in: (field, values) => { state.queried.push([table, 'in', field, values]); return query },
        gte: () => query,
        order: () => query,
        limit: () => query,
        insert: (row) => {
          state.inserts.push({ table, row })
          if (state.insertError) throw state.insertError
          return query
        },
        then: (resolve) => resolve({ data: state.cacheError ? null : state.cached, error: state.cacheError }),
      }
      return query
    },
  }),
  check: ({ data, error }) => { if (error) throw error; return data },
}))

const { checkAccount, checkAccounts, CACHE_MS } = await import('../../server/accounthealth.js')

const account = {
  id: 'acc-1',
  username: 'mock-shop',
  auth_mode: 'unified_login',
  platform_user_id: '101',
  access_token_encrypted: encrypt('mock-suat'),
  token_expires_at: null,
}

let calls
// Every check reads the account type first: messaging does not exist for a
// Creator account, so the type is part of the diagnosis.
const profile = (accountType = 'BUSINESS') => ({ id: '101', username: 'mock-shop', account_type: accountType })
const tokenInfo = { data: { app_id: '1234567890', type: 'SYSTEM_USER', is_valid: true, scopes: ['instagram_business_basic', 'instagram_business_manage_comments', 'instagram_business_manage_messages'], expires_at: 1800000000 } }
function responses(...items) {
  const queue = [profile(), tokenInfo, ...items]
  vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
    calls.push({ url: new URL(url), ...options })
    const item = queue.shift()
    if (!item) throw new Error('unexpected request')
    return new Response(JSON.stringify(item.body ?? item), { status: item.status || 200 })
  }))
}

// What Meta answers for a healthy account-level subscription.
const subscribed = { data: [{ id: '1128649916573434', subscribed_fields: ['comments', 'messages'] }] }

beforeEach(() => {
  calls = []
  state.inserts = []
  state.cached = []
  state.cacheError = null
  state.insertError = null
  state.queried = []
  vi.stubEnv('META_APP_ID', '1128649916573434')
  vi.stubEnv('META_APP_SECRET', 'mock-meta-secret')
  vi.stubEnv('INSTAGRAM_LOGIN_MODE', 'unified')
})

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

it('reports a healthy subscription without touching the subscription', async () => {
  responses(subscribed)
  const result = await checkAccount(account)
  expect(result).toMatchObject({ accountId: 'acc-1', subscribed: true, action: 'checked', error: null })
  expect(result.fields).toEqual(['comments', 'messages'])
  expect(result.accountType).toBe('BUSINESS')
  expect(calls).toHaveLength(3)
  expect(calls[0].url.searchParams.get('fields')).toBe('username,account_type')
  expect(calls[1].url.pathname).toBe('/v27.0/debug_token')
  expect(calls[2].method || 'GET').toBe('GET')
  expect(calls[2].url.pathname).toBe('/v27.0/101/subscribed_apps')
  expect(state.inserts[0].row).toMatchObject({ account_id: 'acc-1', subscribed: true, action: 'checked', error: null })
})

it('re-subscribes when the readback is empty, then proves it by reading back again', async () => {
  responses({ data: [] }, { success: true }, subscribed)
  const result = await checkAccount(account)
  expect(result).toMatchObject({ subscribed: true, action: 'resubscribed' })
  expect(calls[3].method).toBe('POST')
  expect(calls[3].url.searchParams.get('subscribed_fields')).toBe('comments,messages')
  expect(state.inserts[0].row).toMatchObject({ subscribed: true, action: 'resubscribed' })
})

it('stops at missing when repair is not allowed', async () => {
  responses({ data: [] })
  const result = await checkAccount(account, { repair: false })
  expect(result).toMatchObject({ subscribed: false, action: 'missing' })
  expect(calls).toHaveLength(3)
})

it('records a Graph failure instead of throwing, without leaking the token', async () => {
  const token = 'mock-suat'
  responses({ status: 401, body: { error: { code: 190, message: `session ${token} expired` } } })
  const result = await checkAccount(account)
  expect(result.subscribed).toBe(false)
  expect(result.action).toBe('failed')
  expect(result.error).toMatch(/Instagram error 190/)
  expect(result.error).not.toContain(token)
  expect(state.inserts[0].row).toMatchObject({ subscribed: false, action: 'failed' })
})

it('still answers when the audit row cannot be written', async () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  responses(subscribed)
  state.insertError = new Error('relation "account_checks" does not exist')
  const result = await checkAccount(account)
  expect(result.subscribed).toBe(true)
  expect(spy.mock.calls[0][0]).toBe('account check not recorded')
  spy.mockRestore()
})

it('answers from the cache inside the window and calls Graph on force', async () => {
  state.cached = [{ account_id: 'acc-1', checked_at: new Date().toISOString(), subscribed: false, fields: [], action: 'missing', error: null }]
  const cached = await checkAccounts([account])
  expect(cached[0]).toMatchObject({ accountId: 'acc-1', subscribed: false, action: 'missing', cached: true })
  expect(calls).toHaveLength(0)
  expect(state.queried[0][1]).toBe('in')

  responses(subscribed)
  const fresh = await checkAccounts([account], { force: true })
  expect(fresh[0]).toMatchObject({ subscribed: true, action: 'checked' })
  expect(fresh[0].cached).toBeUndefined()
  expect(calls).toHaveLength(3)
})

it('does not let a broken cache hide the live check', async () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  state.cacheError = new Error('boom')
  responses(subscribed)
  const results = await checkAccounts([account])
  expect(results[0].subscribed).toBe(true)
  expect(spy.mock.calls[0][0]).toBe('account check cache unreadable')
  spy.mockRestore()
})

it('keeps the cache window short enough to stay useful', () => {
  expect(CACHE_MS).toBeLessThanOrEqual(10 * 60000)
})

it('records the account type so a Creator account is not mistaken for a broken subscription', async () => {
  const queue = [{ id: '101', username: 'mock-shop', account_type: 'MEDIA_CREATOR' }, tokenInfo, subscribed]
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    calls.push({ url: new URL(url) })
    const item = queue.shift()
    if (!item) throw new Error('unexpected request')
    return new Response(JSON.stringify(item), { status: 200 })
  }))
  const result = await checkAccount(account)
  expect(result.accountType).toBe('MEDIA_CREATOR')
  expect(result.tokenAppId).toBe('1234567890')
  expect(result.subscribed).toBe(true)
  expect(state.inserts[0].row).toMatchObject({ account_type: 'MEDIA_CREATOR', subscribed: true })
})
