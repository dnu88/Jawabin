import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The Supabase client is faked; the signature check, the skip rules and the
// duplicate handling in server/routes/webhook.js are the real code under test.
const state = vi.hoisted(() => ({ client: null, inserts: [], autoReply: [], chat: [], autoReplyError: null, chatError: null }))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table) => state.client.from(table), auth: { getUser: async () => ({}) } }),
}))
vi.mock('../../server/autoreply.js', () => ({
  autoReply: async (...args) => {
    state.autoReply.push(args)
    if (state.autoReplyError) throw state.autoReplyError
  },
}))
vi.mock('../../server/chat.js', () => ({
  receiveMessage: async (...args) => {
    state.chat.push(args)
    if (state.chatError) throw state.chatError
  },
}))

const { receiveWebhook, verifyWebhook } = await import('../../server/routes/webhook.js')
const { hmac } = await import('../../server/crypto.js')

const SECRET = process.env.INSTAGRAM_APP_SECRET
const VERIFY = process.env.META_VERIFY_TOKEN

function fakeClient({ account = { id: 'acc-1', user_id: 'user-1', platform: 'instagram', platform_user_id: '17841400000000000' }, insertError = null, inserted = { id: 'comment-1' } } = {}) {
  const chain = (table) => {
    const query = {
      table,
      select: () => query,
      eq: () => query,
      order: () => query,
      limit: () => query,
      range: () => query,
      maybeSingle: async () => ({ data: table === 'accounts' ? account : null, error: null }),
      single: async () => ({ data: inserted, error: insertError }),
      insert: (rows) => {
        state.inserts.push({ table, rows })
        return query
      },
      update: () => query,
      upsert: () => query,
      delete: () => query,
    }
    return query
  }
  return { from: chain }
}

const payload = (over = {}) => ({
  object: 'instagram',
  entry: [
    {
      id: '17841400000000000',
      time: 1700000000,
      changes: [
        {
          field: 'comments',
          value: {
            id: 'comment-abc',
            text: 'Berapa harganya?',
            media: { id: 'media-1' },
            from: { id: '999', username: 'pembeli' },
          },
          ...over,
        },
      ],
    },
  ],
})

function signedPost(body, { signature = true, secret = SECRET } = {}) {
  const raw = JSON.stringify(body)
  const headers = { 'content-type': 'application/json' }
  if (signature) headers['x-hub-signature-256'] = `sha256=${hmac(secret, raw)}`
  return new Request('https://jawabin.test/api/webhook/meta', { method: 'POST', headers, body: raw })
}

beforeEach(() => {
  state.inserts = []
  state.autoReply = []
  state.chat = []
  state.autoReplyError = null
  state.chatError = null
  state.client = fakeClient()
})

afterEach(() => vi.unstubAllEnvs())

describe('unified and legacy webhook signatures coexist', () => {
  it('accepts Meta-signed unified account events even when new-login mode is rolled back', async () => {
    vi.stubEnv('META_APP_SECRET', 'mock-meta-secret')
    vi.stubEnv('INSTAGRAM_LOGIN_MODE', 'instagram_login')
    state.client = fakeClient({ account: { id: 'acc-1', user_id: 'user-1', platform_user_id: '17841400000000000', auth_mode: 'unified_login' } })
    await receiveWebhook(signedPost(payload(), { secret: 'mock-meta-secret' }))
    expect(state.inserts).toHaveLength(1)
  })
  it('does not let the legacy app secret authorize unified account deliveries', async () => {
    vi.stubEnv('META_APP_SECRET', 'mock-meta-secret')
    state.client = fakeClient({ account: { id: 'acc-1', user_id: 'user-1', platform_user_id: '17841400000000000', auth_mode: 'unified_login' } })
    await receiveWebhook(signedPost(payload()))
    expect(state.inserts).toHaveLength(0)
  })
  it('does not let the Meta app secret authorize legacy account deliveries', async () => {
    vi.stubEnv('META_APP_SECRET', 'mock-meta-secret')
    await receiveWebhook(signedPost(payload(), { secret: 'mock-meta-secret' }))
    expect(state.inserts).toHaveLength(0)
  })
  it('continues legacy signatures in unified start mode; never bypasses missing configuration', async () => {
    vi.stubEnv('INSTAGRAM_LOGIN_MODE', 'unified')
    vi.stubEnv('META_APP_SECRET', '')
    await receiveWebhook(signedPost(payload()))
    expect(state.inserts).toHaveLength(1)
    vi.stubEnv('INSTAGRAM_APP_SECRET', '')
    await expect(receiveWebhook(signedPost(payload()))).rejects.toThrow(/bad signature/)
  })
  it('rejects a bare digest without sha256= and a signed payload that was changed', async () => {
    const raw = JSON.stringify(payload())
    for (const signature of [hmac(SECRET, raw), `sha256=${hmac(SECRET, raw + ' ')}`]) {
      const request = new Request('https://app.test/webhook', { method: 'POST', body: raw, headers: { 'x-hub-signature-256': signature } })
      await expect(receiveWebhook(request)).rejects.toThrow(/bad signature/)
    }
    expect(state.inserts).toHaveLength(0)
  })
})

describe('verifyWebhook (GET handshake)', () => {
  it('echoes hub.challenge when mode and token match', async () => {
    const url = new URL(`https://jawabin.test/api/webhook/meta?hub.mode=subscribe&hub.verify_token=${VERIFY}&hub.challenge=challenge-123`)
    const response = verifyWebhook(url)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('challenge-123')
  })

  it('refuses a wrong token or wrong mode', async () => {
    const wrongToken = new URL('https://jawabin.test/api/webhook/meta?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=x')
    expect(() => verifyWebhook(wrongToken)).toThrowError(/verification failed/)
    const wrongMode = new URL(`https://jawabin.test/api/webhook/meta?hub.mode=unsubscribe&hub.verify_token=${VERIFY}`)
    expect(() => verifyWebhook(wrongMode)).toThrowError(/verification failed/)
  })
})

describe('receiveWebhook (POST)', () => {
  it('rejects a missing or wrong signature', async () => {
    await expect(receiveWebhook(signedPost(payload(), { signature: false }))).rejects.toThrowError(/bad signature/)
    await expect(receiveWebhook(signedPost(payload(), { secret: 'other-secret' }))).rejects.toThrowError(/bad signature/)
    expect(state.inserts).toHaveLength(0)
  })

  it('stores the comment and hands it to the auto reply engine', async () => {
    const response = await receiveWebhook(signedPost(payload()))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })

    expect(state.inserts).toHaveLength(1)
    const row = state.inserts[0].rows
    expect(row).toMatchObject({
      user_id: 'user-1',
      account_id: 'acc-1',
      platform_comment_id: 'comment-abc',
      media_id: 'media-1',
      text: 'Berapa harganya?',
      from_id: '999',
      from_username: 'pembeli',
    })
    expect(state.autoReply).toHaveLength(1)
    expect(state.autoReply[0][1]).toEqual({ id: 'comment-1' })
  })

  it('ignores a delivery Meta retried (duplicate platform id)', async () => {
    state.client = fakeClient({ insertError: { code: '23505', message: 'duplicate key value' } })
    const response = await receiveWebhook(signedPost(payload()))
    expect(response.status).toBe(200)
    expect(state.autoReply).toHaveLength(0)
  })

  it('never answers its own comment', async () => {
    const body = payload()
    body.entry[0].changes[0].value.from.id = '17841400000000000'
    await receiveWebhook(signedPost(body))
    expect(state.inserts).toHaveLength(0)
    expect(state.autoReply).toHaveLength(0)
  })

  it('ignores comments for accounts that are not connected', async () => {
    state.client = fakeClient({ account: null })
    await receiveWebhook(signedPost(payload()))
    expect(state.inserts).toHaveLength(0)
  })

  it('skips changes that are not comments and values without id or text', async () => {
    const otherField = payload()
    otherField.entry[0].changes[0].field = 'mentions'
    await receiveWebhook(signedPost(otherField))

    const noText = payload()
    delete noText.entry[0].changes[0].value.text
    await receiveWebhook(signedPost(noText))

    expect(state.inserts).toHaveLength(0)
  })

  it('answers 200 for a non-instagram object without touching the database', async () => {
    const response = await receiveWebhook(signedPost({ object: 'page', entry: [] }))
    expect(await response.json()).toEqual({ ok: true })
    expect(state.inserts).toHaveLength(0)
  })

  // A comment that could not be stored must not be lost silently: the delivery
  // is answered 500 so Meta retries it. Retries are safe because stored
  // comments are deduplicated by platform_comment_id (23505 above).
  it('answers 500 and logs it when a comment cannot be stored, so Meta retries', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    state.client = fakeClient({ insertError: { code: '42P01', message: 'relation "comments" does not exist' } })
    await expect(receiveWebhook(signedPost(payload()))).rejects.toMatchObject({ status: 500 })
    expect(spy.mock.calls[0][0]).toBe('comment failed')
    expect(spy.mock.calls[0][1]).toMatch(/does not exist/)
    expect(state.autoReply).toHaveLength(0)
    spy.mockRestore()
  })

  it('still handles the rest of the batch before answering 500', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const body = payload()
    body.entry.push(JSON.parse(JSON.stringify(body.entry[0])))
    state.client = fakeClient({ insertError: { code: '42P01', message: 'boom' } })
    await expect(receiveWebhook(signedPost(body))).rejects.toMatchObject({ status: 500 })
    expect(state.inserts.filter((call) => call.table == 'comments')).toHaveLength(2)
    expect(spy).toHaveBeenCalledTimes(2)
    spy.mockRestore()
  })

  // Once the comment is stored, a retry would only hit the duplicate check, so
  // a reply failure is logged and the delivery still answers 200.
  it('answers 200 when the comment is stored but the auto reply fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    state.autoReplyError = new Error('graph down')
    const response = await receiveWebhook(signedPost(payload()))
    expect(response.status).toBe(200)
    expect(state.autoReply).toHaveLength(1)
    expect(spy.mock.calls[0][0]).toBe('comment reply failed')
    spy.mockRestore()
  })
})

describe('direct message deliveries', () => {
  // Documented shape (Business Login for Instagram): entry[].messaging[].
  const messagePayload = (value = {}) => ({
    object: 'instagram',
    entry: [
      {
        id: '17841400000000000',
        time: 1700000000,
        messaging: [
          {
            sender: { id: '999' },
            recipient: { id: '17841400000000000' },
            timestamp: 1700000000000,
            message: { mid: 'mid-1', text: 'Bisa COD?' },
            ...value,
          },
        ],
      },
    ],
  })

  it('hands a messaging[] event to the chat module with the connected account', async () => {
    const response = await receiveWebhook(signedPost(messagePayload()))
    expect(response.status).toBe(200)
    expect(state.chat).toHaveLength(1)
    expect(state.chat[0][0]).toMatchObject({ id: 'acc-1', user_id: 'user-1' })
    expect(state.chat[0][1]).toMatchObject({ message: { mid: 'mid-1', text: 'Bisa COD?' } })
  })

  it('does not touch the comment path for a messaging[] event', async () => {
    await receiveWebhook(signedPost(messagePayload()))
    expect(state.inserts.filter((call) => call.table == 'comments')).toHaveLength(0)
    expect(state.autoReply).toHaveLength(0)
  })

  it('also accepts the older changes[] wrapper for messages', async () => {
    const body = messagePayload()
    const event = body.entry[0].messaging[0]
    delete body.entry[0].messaging
    body.entry[0].changes = [{ field: 'messages', value: event }]
    await receiveWebhook(signedPost(body))
    expect(state.chat).toHaveLength(1)
  })

  it('skips a message event without a mid (handoff notices have none)', async () => {
    const body = messagePayload()
    body.entry[0].messaging[0].message = { text: 'tanpa mid' }
    await receiveWebhook(signedPost(body))
    expect(state.chat).toHaveLength(0)
  })

  it('skips messages for an account that is not connected', async () => {
    state.client = fakeClient({ account: null })
    await receiveWebhook(signedPost(messagePayload()))
    expect(state.chat).toHaveLength(0)
  })

  it('answers 500 when a message cannot be stored, after handling the comment in the same delivery', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    state.chatError = Object.assign(new Error('insert failed'), { status: 500 })
    const body = payload()
    body.entry[0].messaging = [messagePayload().entry[0].messaging[0]]
    await expect(receiveWebhook(signedPost(body))).rejects.toMatchObject({ status: 500 })
    expect(state.inserts.filter((call) => call.table == 'comments')).toHaveLength(1)
    expect(spy.mock.calls[0][0]).toBe('message failed')
    spy.mockRestore()
  })

  it('handles comments and messages in one delivery', async () => {
    const body = payload()
    const messaging = messagePayload().entry[0].messaging[0]
    body.entry[0].messaging = [messaging]
    const response = await receiveWebhook(signedPost(body))
    expect(response.status).toBe(200)
    expect(state.inserts.filter((call) => call.table == 'comments')).toHaveLength(1)
    expect(state.chat).toHaveLength(1)
  })
})

describe('entry-level comment payload', () => {
  // The Business Login examples put field/value straight on the entry.
  it('accepts field/value on the entry instead of inside changes[]', async () => {
    const body = {
      object: 'instagram',
      entry: [
        {
          id: '17841400000000000',
          time: 1700000000,
          field: 'comments',
          value: { id: 'c-1', text: 'harga?', media: { id: 'm-1' }, from: { id: '999', username: 'pembeli' } },
        },
      ],
    }
    await receiveWebhook(signedPost(body))
    expect(state.inserts.filter((call) => call.table == 'comments')).toHaveLength(1)
  })

  it('treats live_comments like comments', async () => {
    const body = payload()
    body.entry[0].changes[0].field = 'live_comments'
    await receiveWebhook(signedPost(body))
    expect(state.inserts.filter((call) => call.table == 'comments')).toHaveLength(1)
  })
})
