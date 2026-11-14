import { afterEach, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ rows: [], filters: [] }))
vi.mock('../../server/db.js', () => ({
  db: () => ({ from: table => {
    const query = {
      select: () => query,
      eq: (field, value) => { state.filters.push([table, field, value]); return query },
      order: async () => ({ data: state.rows, error: null }),
    }
    return query
  } }),
  check: ({ data, error }) => { if (error) throw Error('DB error'); return data },
}))
import { instagramAuthorize, listAccounts } from '../../server/routes/accounts.js'
import { readState } from '../../server/crypto.js'
afterEach(() => vi.unstubAllEnvs())
it('binds the user and selected mode into HMAC state; configuration scopes stay server-side', async () => {
  vi.stubEnv('INSTAGRAM_LOGIN_MODE', 'unified')
  vi.stubEnv('META_APP_ID', '123')
  vi.stubEnv('META_APP_SECRET', 'mock-meta-secret')
  vi.stubEnv('META_LOGIN_CONFIG_ID', '456')
  const { url } = await (await instagramAuthorize({ id: 'signed-user' }, {}, new URL('https://app.test/api/instagram/authorize'))).json()
  const auth = new URL(url)
  expect(auth.searchParams.get('redirect_uri')).toBe('https://app.test/api/instagram/callback')
  expect(readState(auth.searchParams.get('state'))).toMatchObject({ userId: 'signed-user', authMode: 'unified_login' })
  expect(url).not.toContain('mock-meta-secret')
  expect(auth.searchParams.has('scope')).toBe(false)
})
it('keeps the existing public account shape and never exposes credentials or internal business metadata', async () => {
  state.rows = [{ id: 'acc-1', user_id: 'signed-user', platform: 'instagram', username: 'mock-shop', name: 'Shop', picture: '', created_at: '2026-01-01', token_expires_at: null, auth_mode: 'unified_login', access_token_encrypted: 'mock-sensitive', client_business_id: '999', login_config_id: '456' }]
  const result = await (await listAccounts({ id: 'signed-user' })).json()
  expect(result).toEqual([{ _id: 'acc-1', platform: 'instagram', username: 'mock-shop', name: 'Shop', picture: '', createdAt: '2026-01-01', tokenExpiresAt: null }])
  expect(state.filters).toContainEqual(['accounts', 'user_id', 'signed-user'])
})
