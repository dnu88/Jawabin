import { beforeEach, describe, expect, it, vi } from 'vitest'

// In-memory stand-in for Supabase that understands the filters dashboard.js
// uses, so the numbers are computed from real rows instead of stubbed constants.
const state = vi.hoisted(() => ({ client: null }))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table) => state.client.from(table), auth: { getUser: async () => ({}) } }),
}))

const { getDashboard } = await import('../../server/routes/dashboard.js')

const HOUR = 3600000
const now = Date.now()

function fakeDb({ comments = [], accounts = 0, usage = [] } = {}) {
  const rows = { comments, accounts: Array.from({ length: accounts }, (_, i) => ({ id: `a${i}`, user_id: 'user-1' })), ai_usage: usage }
  return {
    from(table) {
      const q = {
        table,
        head: false,
        filters: [],
        select(_cols, options = {}) {
          q.head = !!options.head
          return q
        },
        eq(column, value) {
          q.filters.push((row) => row[column] == value)
          return q
        },
        gte(column, value) {
          q.filters.push((row) => row[column] >= value)
          return q
        },
        in(column, values) {
          q.filters.push((row) => values.includes(row[column]))
          return q
        },
        limit() {
          return q
        },
        then(resolve) {
          const matches = (rows[table] || []).filter((row) => q.filters.every((test) => test(row)))
          resolve({
            data: q.head ? null : matches.map((row) => ({ ...row })),
            count: q.head ? matches.length : null,
            error: null,
          })
        },
      }
      return q
    },
  }
}

const comment = (over = {}) => ({
  id: 'c',
  user_id: 'user-1',
  status: 'pending',
  replied_by: '',
  created_at: new Date(now - HOUR).toISOString(),
  ...over,
})

beforeEach(() => {
  state.client = fakeDb()
})

describe('GET /dashboard', () => {
  it('counts today, the last seven days and open work from real rows', async () => {
    state.client = fakeDb({
      accounts: 2,
      comments: [
        comment({ id: 'a', created_at: new Date(now - HOUR).toISOString() }),
        comment({ id: 'b', created_at: new Date(now - 3 * 24 * HOUR).toISOString() }),
        comment({ id: 'c', created_at: new Date(now - 20 * 24 * HOUR).toISOString() }),
        comment({ id: 'd', status: 'resolved', replied_by: 'rule' }),
        comment({ id: 'e', status: 'resolved', replied_by: 'manual' }),
        comment({ id: 'f', status: 'ignored' }),
      ],
    })

    const body = await (await getDashboard({ id: 'user-1' })).json()

    expect(body.commentsToday).toBe(4) // a, d, e, f dibuat satu jam lalu
    expect(body.commentsWeek).toBe(5) // semua kecuali c yang 20 hari
    expect(body.pending).toBe(3)
    expect(body.replied).toBe(2)
    expect(body.autoReplied).toBe(1)
    expect(body.autoRate).toBe(0.5)
    expect(body.accounts).toBe(2)
    expect(body.range.days).toBe(7)
  })

  it('never counts another user\'s rows', async () => {
    state.client = fakeDb({
      comments: [comment({ id: 'mine' }), comment({ id: 'theirs', user_id: 'user-2' })],
      accounts: 1,
    })
    const body = await (await getDashboard({ id: 'user-1' })).json()
    expect(body.commentsToday).toBe(1)
    expect(body.commentsWeek).toBe(1)
    expect(body.pending).toBe(1)
  })

  it('sends a user_id filter on every query', async () => {
    const seen = []
    state.client = fakeDb()
    const original = state.client.from
    state.client = {
      from(table) {
        const q = original.bind(state.client)(table)
        const eq = q.eq
        q.eq = (column, value) => {
          if (column == 'user_id') seen.push([table, value])
          return eq(column, value)
        }
        return q
      },
    }
    await getDashboard({ id: 'user-1' })
    // comments x5, accounts, ai_usage x2
    expect(seen.length).toBe(8)
    expect(seen.every(([, value]) => value == 'user-1')).toBe(true)
    expect(new Set(seen.map(([table]) => table))).toEqual(new Set(['comments', 'accounts', 'ai_usage']))
  })

  it('sums tokens for the week and for all time separately', async () => {
    state.client = fakeDb({
      usage: [
        { user_id: 'user-1', token: 100, created_at: new Date(now - HOUR).toISOString() },
        { user_id: 'user-1', token: 50, created_at: new Date(now - 3 * 24 * HOUR).toISOString() },
        { user_id: 'user-1', token: 25, created_at: new Date(now - 30 * 24 * HOUR).toISOString() },
      ],
    })
    const body = await (await getDashboard({ id: 'user-1' })).json()
    expect(body.tokensWeek).toBe(150)
    expect(body.tokensTotal).toBe(175)
  })

  it('reports zero percent when nothing has been answered yet', async () => {
    state.client = fakeDb({ comments: [comment(), comment({ id: 'b' })] })
    const body = await (await getDashboard({ id: 'user-1' })).json()
    expect(body.replied).toBe(0)
    expect(body.autoReplied).toBe(0)
    expect(body.autoRate).toBe(0)
  })

  it('rounds the auto-reply rate to three decimals', async () => {
    state.client = fakeDb({
      comments: [
        comment({ id: 'a', status: 'resolved', replied_by: 'ai' }),
        comment({ id: 'b', status: 'resolved', replied_by: 'manual' }),
        comment({ id: 'c', status: 'resolved', replied_by: 'rule' }),
      ],
    })
    const body = await (await getDashboard({ id: 'user-1' })).json()
    expect(body.autoRate).toBe(0.667)
  })
})
