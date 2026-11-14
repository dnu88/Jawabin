import { beforeEach, describe, expect, it, vi } from 'vitest'

// The activity log and notification preferences, with a fake Supabase.
const state = vi.hoisted(() => ({ calls: [], rows: [], count: 0, failInsert: false }))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table) => {
      const query = {
        select: () => query,
        eq: (field, value) => (state.calls.push({ op: 'eq', table, field, value }), query),
        gte: (field, value) => (state.calls.push({ op: 'gte', table, field, value }), query),
        order: () => query,
        range: () => query,
        maybeSingle: () => query,
        insert: (row) => {
          if (state.failInsert) throw new Error('database is down')
          state.calls.push({ op: 'insert', table, row })
          return query
        },
        update: (row) => (state.calls.push({ op: 'update', table, row }), query),
        then: (resolve) => resolve({ data: state.rows, error: null, count: state.count }),
      }
      return query
    },
  }),
}))

const { logActivity, listActivities } = await import('../../server/activity.js')
const { putNotification } = await import('../../server/routes/profile.js')

const user = { id: 'user-1', email: 'a@b.c', user_metadata: { name: 'Ana' } }
const request = new Request('https://app.example.com/api/rules', {
  headers: { 'user-agent': 'Vitest', 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
})

beforeEach(() => Object.assign(state, { calls: [], rows: [], count: 0, failInsert: false }))

describe('logActivity', () => {
  it('stores who did what, with the first forwarded IP', async () => {
    await logActivity('user-1', request, { module: 'automation', action: 'create' })
    const { row } = state.calls.find((call) => call.op == 'insert')
    expect(row).toMatchObject({ user_id: 'user-1', module: 'automation', action: 'create', status: 'success', user_agent: 'Vitest', ip: '203.0.113.9' })
  })

  it('never throws, so a broken log cannot fail the action', async () => {
    state.failInsert = true
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(logActivity('user-1', null, { module: 'account', action: 'connect' })).resolves.toBeUndefined()
    quiet.mockRestore()
  })
})

describe('listActivities', () => {
  it('filters by the signed-in user and maps rows for the page', async () => {
    state.rows = [{ id: 'a1', module: 'comment', action: 'reply', status: 'success', source: 'web', target_label: '', detail: {}, error_message: '', user_agent: 'UA', ip: '1.1.1.1', created_at: '2026-11-14T00:00:00Z' }]
    state.count = 61
    const url = new URL('https://app.example.com/api/activities?page=2&limit=30&status=failed&module=&fromDate=2026-11-01T00:00:00Z')
    const body = await (await listActivities(user, {}, url)).json()
    expect(body).toMatchObject({ page: 2, totalPages: 3 })
    expect(body.docs[0]).toMatchObject({ _id: 'a1', module: 'comment', action: 'reply', target: null, actor: { type: 'owner', name: 'Ana', email: 'a@b.c' } })
    expect(state.calls).toContainEqual({ op: 'eq', table: 'activities', field: 'user_id', value: 'user-1' })
    expect(state.calls).toContainEqual({ op: 'eq', table: 'activities', field: 'status', value: 'failed' })
    expect(state.calls.some((call) => call.field == 'module')).toBe(false)
    expect(state.calls).toContainEqual({ op: 'gte', table: 'activities', field: 'created_at', value: '2026-11-01T00:00:00Z' })
  })
})

describe('putNotification', () => {
  it('keeps only the known switches, as booleans', async () => {
    const body = await (await putNotification(user, { expired: 1, account: 0, admin: true })).json()
    expect(body.notification).toEqual({ affiliate: false, expired: true, transaction: false, account: false })
    expect(state.calls.find((call) => call.op == 'update').row).toEqual({ notification: body.notification })
  })
})
