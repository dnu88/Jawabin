import { beforeEach, describe, expect, it, vi } from 'vitest'

// A small in-memory Supabase: enough of the query builder for server/chat.js and
// the chat routes, so the filters and the duplicate-message guard are real code.
const state = vi.hoisted(() => ({ chats: [], messages: [], rules: [] }))

vi.mock('@supabase/supabase-js', () => {
  const list = (table) => (state[table] ||= [])
  const matches = (table, filters) =>
    list(table).filter((row) =>
      filters.every(([op, column, value]) => {
        if (op == 'eq') return String(row[column]) === String(value)
        if (op == 'gte') return String(row[column] || '') >= String(value)
        if (op == 'in') return value.includes(row[column])
        return true
      }),
    )
    const from = (table) => {
    const q = { table, filters: [], payload: null, mode: 'select', limit: null, range: null, head: false, wantCount: false }
    const op = () => {
      if (q.mode == 'insert' || q.mode == 'upsert') {
        if (q.mode == 'insert' && table == 'messages' && q.payload.platform_message_id) {
          const seen = list(table).some((row) => row.platform_message_id === q.payload.platform_message_id)
          if (seen) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
        }
        if (q.mode == 'upsert') {
          const existing = list(table).find(
            (row) => String(row.account_id) === String(q.payload.account_id) && String(row.platform_chat_id) === String(q.payload.platform_chat_id),
          )
          if (existing) {
            Object.assign(existing, q.payload)
            return { data: existing, error: null }
          }
        }
        const row = { id: `${table}-${list(table).length + 1}`, unread: 0, created_at: new Date().toISOString(), ...q.payload }
        list(table).push(row)
        return { data: row, error: null }
      }
      if (q.mode == 'update') {
        const rows = matches(table, q.filters)
        for (const row of rows) Object.assign(row, q.payload)
        return { data: rows, error: null }
      }
      const rows = matches(table, q.filters)
      let page = rows
      if (q.range) page = rows.slice(q.range[0], q.range[1] + 1)
      if (q.limit) page = page.slice(0, q.limit)
      return { data: q.head ? null : page, count: q.head || q.wantCount ? rows.length : null, error: null }
    }
    const api = {
      select: (_cols, options = {}) => {
        q.head = !!options.head
        q.wantCount = !!options.count
        return api
      },
      insert: (rows) => {
        q.mode = 'insert'
        q.payload = rows
        return api
      },
      upsert: (row) => {
        q.mode = 'upsert'
        q.payload = row
        return api
      },
      update: (row) => {
        q.mode = 'update'
        q.payload = row
        return api
      },
      eq: (column, value) => {
        q.filters.push(['eq', column, value])
        return api
      },
      gte: (column, value) => {
        q.filters.push(['gte', column, value])
        return api
      },
      in: (column, values) => {
        q.filters.push(['in', column, values])
        return api
      },
      order: () => api,
      range: (from, to) => {
        q.range = [from, to]
        return api
      },
      limit: (n) => {
        q.limit = n
        return api
      },
      maybeSingle: async () => {
        const result = op()
        return { data: q.mode == 'select' ? (result.data || [])[0] || null : result.data || null, error: result.error || null }
      },
      single: async () => {
        const result = op()
        if (result.error) return { data: null, error: result.error }
        return { data: q.mode == 'select' ? (result.data || [])[0] || null : result.data || null, error: null }
      },
      then: (resolve) => Promise.resolve(resolve(op())),
    }
    return api
  }
  return { createClient: () => ({ from }), auth: { getUser: async () => ({}) } }
})

vi.mock('../../server/ai.js', () => ({ generate: vi.fn(), loadSettings: vi.fn(), logUsage: vi.fn() }))
vi.mock('../../server/instagram.js', () => ({ sendMessage: vi.fn() }))

const { sendMessage } = await import('../../server/instagram.js')
const { generate, loadSettings, logUsage } = await import('../../server/ai.js')
const { WINDOW_MS, receiveMessage, windowOpen } = await import('../../server/chat.js')
const { getChat, listChats, sendChatMessage } = await import('../../server/routes/chats.js')

const HOUR = 3600000
const account = { id: 'acc-1', user_id: 'user-1', platform: 'instagram', platform_user_id: '17841400000000000' }
const user = { id: 'user-1' }

const keywordRule = (over = {}) => ({
  id: 'r1',
  user_id: 'user-1',
  account_id: null,
  name: 'DM COD',
  type: 'keyword',
  channel: 'chat',
  keywords: ['cod'],
  reply: 'Bisa kak, COD tersedia.',
  prompt: '',
  is_active: true,
  ...over,
})

const inbound = (over = {}) => ({
  sender: { id: 'igsid-9' },
  recipient: { id: '17841400000000000' },
  timestamp: Date.now(),
  message: { mid: 'mid-1', text: 'Bisa COD?' },
  ...over,
})

beforeEach(() => {
  state.chats = []
  state.messages = []
  state.rules = []
  vi.resetAllMocks()
  sendMessage.mockResolvedValue({ message_id: 'sent-1' })
  loadSettings.mockResolvedValue({ type: 'gemini', model: 'm', token: 't' })
  generate.mockResolvedValue({ text: 'Balasan AI', tokens: 12, request: {}, response: {} })
})

describe('windowOpen', () => {
  it('is open inside 24 hours and closed after it', () => {
    expect(windowOpen({ last_inbound_at: new Date(Date.now() - 23 * HOUR).toISOString() })).toBe(true)
    expect(windowOpen({ last_inbound_at: new Date(Date.now() - 25 * HOUR).toISOString() })).toBe(false)
  })

  it('is closed when the person never wrote to us', () => {
    expect(windowOpen({})).toBe(false)
    expect(windowOpen(null)).toBe(false)
  })

  it('uses 24 hours exactly, not a rounded day', () => {
    expect(WINDOW_MS).toBe(86400000)
    expect(windowOpen({ last_inbound_at: new Date(Date.now() - (WINDOW_MS - 60000)).toISOString() })).toBe(true)
    expect(windowOpen({ last_inbound_at: new Date(Date.now() - (WINDOW_MS + 60000)).toISOString() })).toBe(false)
  })
})

describe('receiveMessage', () => {
  it('stores the DM, counts it as unread and answers it with a chat rule', async () => {
    state.rules = [keywordRule()]
    const result = await receiveMessage(account, inbound())

    expect(result.replied).toBe(true)
    expect(state.chats).toHaveLength(1)
    expect(state.chats[0]).toMatchObject({ user_id: 'user-1', account_id: 'acc-1', platform_chat_id: 'igsid-9', unread: 1 })
    expect(state.messages.map((row) => row.direction)).toEqual(['in', 'out'])
    expect(state.messages[1]).toMatchObject({ text: 'Bisa kak, COD tersedia.', replied_by: 'rule' })
    expect(sendMessage).toHaveBeenCalledWith(account, 'igsid-9', 'Bisa kak, COD tersedia.')
  })

  it('reuses the existing conversation instead of creating a second one', async () => {
    state.rules = [keywordRule()]
    await receiveMessage(account, inbound({ message: { mid: 'mid-1', text: 'Bisa COD?' } }))
    await receiveMessage(account, inbound({ message: { mid: 'mid-2', text: 'COD ke Bali?' } }))
    expect(state.chats).toHaveLength(1)
    expect(state.chats[0].unread).toBe(2)
  })

  it('ignores a delivery Meta sent twice', async () => {
    state.rules = [keywordRule()]
    await receiveMessage(account, inbound())
    const again = await receiveMessage(account, inbound())
    expect(again.duplicate).toBe(true)
    expect(state.messages).toHaveLength(2) // satu masuk, satu balasan
    expect(sendMessage).toHaveBeenCalledTimes(1)
  })

  it('never answers our own outgoing echo', async () => {
    state.rules = [keywordRule()]
    const result = await receiveMessage(account, inbound({ sender: { id: '17841400000000000' } }))
    expect(result.ignored).toBe(true)
    expect(state.messages).toHaveLength(0)
  })

  it('does not answer with a comment-only rule', async () => {
    state.rules = [keywordRule({ channel: 'comment' })]
    const result = await receiveMessage(account, inbound())
    expect(result.replied).toBe(false)
    expect(state.messages).toHaveLength(1)
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('answers with AI and records the usage as a chat', async () => {
    state.rules = [keywordRule({ type: 'ai', keywords: [], prompt: 'Toko buka 09.00-21.00' })]
    await receiveMessage(account, inbound())
    expect(logUsage).toHaveBeenCalledWith('user-1', 'chat', expect.objectContaining({ text: 'Balasan AI' }))
    expect(state.messages[1]).toMatchObject({ text: 'Balasan AI', replied_by: 'ai' })
  })

  it('keeps a failed automatic reply visible in the thread', async () => {
    state.rules = [keywordRule()]
    sendMessage.mockRejectedValueOnce(new Error('Instagram error: outside window'))
    const result = await receiveMessage(account, inbound())
    expect(result.replied).toBe(false)
    const failed = state.messages.find((row) => row.direction == 'out')
    expect(failed.error).toMatch(/outside window/)
  })
})

describe('chat routes', () => {
  const seedChat = (over = {}) => {
    state.chats.push({
      id: 'chat-1',
      user_id: 'user-1',
      account_id: 'acc-1',
      platform: 'instagram',
      platform_chat_id: 'igsid-9',
      participant_id: 'igsid-9',
      last_inbound_at: new Date(Date.now() - HOUR).toISOString(),
      last_message_at: new Date(Date.now() - HOUR).toISOString(),
      last_message_text: 'Bisa COD?',
      unread: 2,
      accounts: { id: 'acc-1', username: 'toko.contoh', picture: '', platform: 'instagram' },
      ...over,
    })
  }

  it('lists conversations with the reply window already resolved', async () => {
    seedChat()
    seedChat({ id: 'chat-2', platform_chat_id: 'igsid-8', last_inbound_at: new Date(Date.now() - 30 * HOUR).toISOString() })
    const body = await (await listChats(user, {}, new URL('https://x/api/chats'))).json()
    expect(body.docs).toHaveLength(2)
    expect(body.docs.find((doc) => doc._id == 'chat-1').canReply).toBe(true)
    expect(body.docs.find((doc) => doc._id == 'chat-2').canReply).toBe(false)
    expect(body.totalPages).toBe(1)
  })

  it('refuses a conversation that belongs to somebody else', async () => {
    seedChat({ user_id: 'user-2' })
    await expect(getChat(user, {}, null, 'chat-1')).rejects.toThrowError(/conversation not found/)
  })

  it('returns the thread oldest first and clears the unread badge', async () => {
    seedChat()
    state.messages = [
      { id: 'm2', user_id: 'user-1', chat_id: 'chat-1', direction: 'in', text: 'kedua', created_at: '2026-01-02T00:00:00Z' },
      { id: 'm1', user_id: 'user-1', chat_id: 'chat-1', direction: 'in', text: 'pertama', created_at: '2026-01-01T00:00:00Z' },
    ]
    const body = await (await getChat(user, {}, null, 'chat-1')).json()
    expect(body.messages.map((message) => message.text)).toEqual(['pertama', 'kedua'])
    expect(body.chat.unread).toBe(0)
    expect(state.chats[0].unread).toBe(0)
  })

  it('rejects an empty message', async () => {
    seedChat()
    await expect(sendChatMessage(user, { text: '   ' }, null, 'chat-1')).rejects.toThrowError(/message is required/)
  })

  it('refuses to send outside the 24-hour window', async () => {
    seedChat({ last_inbound_at: new Date(Date.now() - 25 * HOUR).toISOString() })
    await expect(sendChatMessage(user, { text: 'Halo' }, null, 'chat-1')).rejects.toThrowError(/24-hour reply window/)
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('sends inside the window and stores the outgoing message', async () => {
    seedChat()
    const body = await (await sendChatMessage(user, { text: '  Bisa kak  ' }, null, 'chat-1')).json()
    expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'acc-1' }), 'igsid-9', 'Bisa kak')
    expect(body).toMatchObject({ direction: 'out', text: 'Bisa kak', repliedBy: 'manual' })
    expect(state.chats[0].last_message_text).toBe('Bisa kak')
  })
})
