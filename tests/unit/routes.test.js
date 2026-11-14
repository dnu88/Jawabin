import { beforeEach, describe, expect, it, vi } from 'vitest'

// Validation and mapping in the rules/comments routes, with a fake Supabase.
const state = vi.hoisted(() => ({ client: null, calls: [] }))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table) => state.client.from(table), auth: { getUser: async () => ({}) } }),
}))

const rules = await import('../../server/routes/rules.js')
const comments = await import('../../server/routes/comments.js')

const user = { id: 'user-1' }

function fakeClient({ account = null, ruleRow = null, commentRow = null, insertRow = null, listRows = [] } = {}) {
  return {
    from: (table) => {
      const query = {
        table,
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: () => query,
        range: () => query,
        insert: (rows) => {
          state.calls.push({ op: 'insert', table, rows })
          return query
        },
        update: (rows) => {
          state.calls.push({ op: 'update', table, rows })
          return query
        },
        delete: () => {
          state.calls.push({ op: 'delete', table })
          return query
        },
        maybeSingle: async () => ({
          data: table === 'accounts' ? account : table === 'rules' ? ruleRow : table === 'comments' ? commentRow : null,
          error: null,
        }),
        single: async () => ({ data: insertRow, error: null }),
        then: (resolve) => resolve({ data: listRows, count: listRows.length, error: null }),
      }
      return query
    },
  }
}

beforeEach(() => {
  state.calls = []
  state.client = fakeClient()
})

describe('rules.createRule validation', () => {
  it('requires a name', async () => {
    await expect(rules.createRule(user, { type: 'keyword', keywords: ['harga'], reply: 'x' })).rejects.toThrowError(/name is required/)
  })

  it('requires keywords and a reply for keyword rules', async () => {
    await expect(rules.createRule(user, { name: 'Harga', type: 'keyword', keywords: [], reply: 'x' })).rejects.toThrowError(/keywords and reply are required/)
    await expect(rules.createRule(user, { name: 'Harga', type: 'keyword', keywords: ['harga'], reply: '  ' })).rejects.toThrowError(/keywords and reply are required/)
  })

  it('requires instructions for AI rules', async () => {
    await expect(rules.createRule(user, { name: 'AI', type: 'ai', prompt: '' })).rejects.toThrowError(/instructions are required/)
  })

  it('defaults an unknown type to keyword', async () => {
    state.client = fakeClient({ insertRow: { id: 'r1', name: 'X', type: 'keyword', keywords: ['a'], reply: 'b', is_active: true } })
    const response = await rules.createRule(user, { name: 'X', type: 'weird', keywords: ['a'], reply: 'b' })
    expect((await response.json()).type).toBe('keyword')
    expect(state.calls[0].rows.type).toBe('keyword')
  })

  it('refuses an account that belongs to somebody else', async () => {
    state.client = fakeClient({ account: null })
    await expect(rules.createRule(user, { name: 'X', type: 'keyword', keywords: ['a'], reply: 'b', accountId: 'acc-other' }))
      .rejects.toThrowError(/account not found/)
  })

  it('cleans and trims the stored row', async () => {
    state.client = fakeClient({ insertRow: { id: 'r1', name: 'Harga', type: 'keyword', keywords: ['harga'], reply: 'Cek bio', is_active: true } })
    await rules.createRule(user, {
      name: '  Harga  ',
      type: 'keyword',
      keywords: [' harga ', '', 'ongkir'],
      reply: '  Cek bio  ',
      prompt: ' diabaikan ',
      isActive: false,
    })
    const stored = state.calls[0].rows
    expect(stored).toMatchObject({
      name: 'Harga',
      keywords: ['harga', 'ongkir'],
      reply: 'Cek bio',
      prompt: '',
      is_active: false,
      account_id: null,
      user_id: 'user-1',
    })
  })

  it('maps a row to the camelCase document the UI expects', async () => {
    state.client = fakeClient({
      insertRow: { id: 'r1', account_id: null, name: 'Harga', type: 'keyword', keywords: ['harga'], reply: 'Cek bio', prompt: '', is_active: true, created_at: '2026-01-01T00:00:00Z' },
    })
    const doc = await (await rules.createRule(user, { name: 'Harga', type: 'keyword', keywords: ['harga'], reply: 'Cek bio' })).json()
    expect(doc).toEqual({
      _id: 'r1',
      accountId: '',
      name: 'Harga',
      type: 'keyword',
      keywords: ['harga'],
      reply: 'Cek bio',
      prompt: '',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
    })
  })
})

describe('comments routes', () => {
  it('rejects an empty reply before touching the platform', async () => {
    await expect(comments.replyComment(user, { text: '   ' }, null, 'c1')).rejects.toThrowError(/reply is required/)
  })

  it('rejects an unknown status change', async () => {
    await expect(comments.updateComment(user, { status: 'done' }, null, 'c1')).rejects.toThrowError(/unknown status/)
  })

  it('404s a comment owned by another user', async () => {
    state.client = fakeClient({ commentRow: null })
    await expect(comments.updateComment(user, { status: 'ignored' }, null, 'c1')).rejects.toThrowError(/comment not found/)
  })

  it('maps an embedded account and status into the document', async () => {
    state.client = fakeClient({
      commentRow: {
        id: 'c1', account_id: 'a1', text: 'halo', from_username: 'pembeli', status: 'pending',
        reply_text: '', replied_by: '', error: '', created_at: '2026-01-01T00:00:00Z',
        platform_comment_id: 'pc1',
        accounts: { username: 'toko', platform: 'instagram' },
      },
      listRows: [],
    })
    const doc = await (await comments.updateComment(user, { status: 'ignored' }, null, 'c1')).json()
    expect(doc).toMatchObject({ _id: 'c1', status: 'ignored', from: 'pembeli', account: { username: 'toko', platform: 'instagram' } })
  })
})
