// Real end-to-end proof of the DM flow: a real Postgres (via a local Supabase
// stack), real migrations, real HMAC webhook verification, real GoTrue tokens,
// real HTTP through api/index.js. Only the Instagram Graph API is replaced, by a
// local stub that records the requests we send it.
//
// Skipped unless JAWABIN_INTEGRATION=1 and the Supabase env vars are set.
import { createHmac } from 'node:crypto'
import { createServer } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON = process.env.SUPABASE_ANON_KEY
const enabled = process.env.JAWABIN_INTEGRATION === '1' && !!SUPABASE_URL && !!SERVICE && !!ANON

const IG_USER_ID = '17841400000000001'
const SECRET = process.env.INSTAGRAM_APP_SECRET || 'test-app-secret'

describe.skipIf(!enabled)('DM flow on a real Supabase stack', () => {
  let admin
  let session // anon client used for password sign-in
  let apiServer
  let graphServer
  let apiUrl
  let graphCalls = []
  let userId
  let accessToken
  let accountId
  let chatId

  const postWebhook = (payload, { signature = true } = {}) => {
    const raw = JSON.stringify(payload)
    const headers = { 'content-type': 'application/json' }
    if (signature) headers['x-hub-signature-256'] = `sha256=${createHmac('sha256', SECRET).update(raw).digest('hex')}`
    return fetch(`${apiUrl}/api/webhook/meta`, { method: 'POST', headers, body: raw })
  }

  const delivery = (mid, text = 'Bisa COD?', extra = {}) => ({
    object: 'instagram',
    entry: [
      {
        id: IG_USER_ID,
        time: Math.floor(Date.now() / 1000),
        // Documented shape for messaging: entry[].messaging[].
        messaging: [
          {
            sender: { id: 'igsid-900' },
            recipient: { id: IG_USER_ID },
            timestamp: Date.now(),
            message: { mid, text, ...extra },
          },
        ],
      },
    ],
  })

  beforeAll(async () => {
    // 1. Stand-in for graph.instagram.com: records the request, answers like Meta.
    graphServer = createServer((request, response) => {
      const chunks = []
      request.on('data', (chunk) => chunks.push(chunk))
      request.on('end', () => {
        graphCalls.push({
          method: request.method,
          url: request.url,
          authorization: request.headers.authorization,
          body: chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null,
        })
        response.writeHead(200, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ message_id: `m-${graphCalls.length}`, recipient_id: 'igsid-900' }))
      })
    })
    await new Promise((resolve) => graphServer.listen(0, '127.0.0.1', resolve))
    process.env.INSTAGRAM_GRAPH_BASE = `http://127.0.0.1:${graphServer.address().port}`
    process.env.SUPABASE_URL ||= SUPABASE_URL
    process.env.VITE_SUPABASE_URL ||= SUPABASE_URL
    process.env.SUPABASE_SERVICE_ROLE_KEY ||= SERVICE

    // 2. Serve the real /api handler over a real socket.
    const api = await import('../../api/index.js')
    apiServer = createServer((request, response) => {
      const chunks = []
      request.on('data', (chunk) => chunks.push(chunk))
      request.on('end', async () => {
        try {
          const handler = { GET: api.GET, POST: api.POST, PUT: api.PUT, DELETE: api.DELETE }[request.method]
          const result = await handler(
            new Request(`${apiUrl}${request.url}`, {
              method: request.method,
              headers: request.headers,
              body: chunks.length ? Buffer.concat(chunks) : undefined,
            }),
          )
          const headers = {}
          result.headers.forEach((value, key) => (headers[key] = value))
          response.writeHead(result.status, headers)
          response.end(Buffer.from(await result.arrayBuffer()))
        } catch (error) {
          response.writeHead(500, { 'content-type': 'application/json' })
          response.end(JSON.stringify({ error: String(error) }))
        }
      })
    })
    await new Promise((resolve) => apiServer.listen(0, '127.0.0.1', resolve))
    apiUrl = `http://127.0.0.1:${apiServer.address().port}`

    // 3. A real auth user through the admin API, then a real session token.
    admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } })
    const email = `integration-${Date.now()}@jawabin.test`
    const password = 'integration-password-123'
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    expect(created.error, created.error?.message).toBeNull()
    userId = created.data.user.id

    session = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } })
    const signed = await session.auth.signInWithPassword({ email, password })
    expect(signed.error, signed.error?.message).toBeNull()
    accessToken = signed.data.session.access_token

    // 4. A connected Instagram account with an encrypted token, plus a DM rule.
    const { encrypt } = await import('../../server/crypto.js')
    const account = await admin
      .from('accounts')
      .insert({
        user_id: userId,
        platform: 'instagram',
        platform_user_id: IG_USER_ID,
        username: 'toko.integration',
        name: 'Toko Integration',
        access_token_encrypted: encrypt('ig-test-token'),
        token_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      })
      .select()
      .single()
    expect(account.error, account.error?.message).toBeNull()
    accountId = account.data.id

    const rule = await admin.from('rules').insert({
      user_id: userId,
      account_id: null,
      name: 'DM COD',
      type: 'keyword',
      channel: 'chat',
      keywords: ['cod'],
      reply: 'Bisa kak, COD tersedia.',
      is_active: true,
    })
    expect(rule.error, rule.error?.message).toBeNull()
  })

  afterAll(async () => {
    if (admin && userId) {
      await admin.from('messages').delete().eq('user_id', userId)
      await admin.from('chats').delete().eq('user_id', userId)
      await admin.from('rules').delete().eq('user_id', userId)
      await admin.from('accounts').delete().eq('user_id', userId)
      await admin.auth.admin.deleteUser(userId).catch(() => {})
    }
    if (apiServer) await new Promise((resolve) => apiServer.close(resolve))
    if (graphServer) await new Promise((resolve) => graphServer.close(resolve))
  })

  it('rejects a webhook with a bad signature before touching the database', async () => {
    const response = await postWebhook(delivery('mid-bad-sig'), { signature: false })
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'bad signature' })
    const chats = await admin.from('chats').select('*').eq('user_id', userId)
    expect(chats.data).toHaveLength(0)
  })

  it('stores an inbound DM and answers it through the real rule and Graph call', async () => {
    const response = await postWebhook(delivery('mid-live-1'))
    expect(response.status).toBe(200)

    const chats = await admin.from('chats').select('*').eq('user_id', userId)
    expect(chats.data).toHaveLength(1)
    chatId = chats.data[0].id
    expect(chats.data[0]).toMatchObject({ account_id: accountId, platform_chat_id: 'igsid-900', unread: 1 })

    const messages = await admin.from('messages').select('*').eq('chat_id', chatId).order('created_at')
    expect(messages.data.map((row) => [row.direction, row.text, row.replied_by])).toEqual([
      ['in', 'Bisa COD?', ''],
      ['out', 'Bisa kak, COD tersedia.', 'rule'],
    ])

    // The outbound call really left the process, with a bearer token and Meta's shape.
    const sent = graphCalls.filter((call) => call.url.endsWith('/me/messages'))
    expect(sent).toHaveLength(1)
    expect(sent[0].authorization).toBe('Bearer ig-test-token')
    expect(sent[0].body).toEqual({ recipient: { id: 'igsid-900' }, message: { text: 'Bisa kak, COD tersedia.' } })
  })

  it('ignores the same delivery sent twice (unique platform_message_id)', async () => {
    await postWebhook(delivery('mid-live-1'))
    const inbound = await admin.from('messages').select('*').eq('chat_id', chatId).eq('direction', 'in')
    expect(inbound.data).toHaveLength(1)
    expect(graphCalls.filter((call) => call.url.endsWith('/me/messages'))).toHaveLength(1)
  })

  it('lists the conversation over real HTTP with a real JWT', async () => {
    const response = await fetch(`${apiUrl}/api/chats`, { headers: { authorization: `Bearer ${accessToken}` } })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.docs).toHaveLength(1)
    expect(body.docs[0]).toMatchObject({ _id: chatId, participant: 'igsid-900', canReply: true, unread: 1 })
  })

  it('ignores the echo of our own reply (documented is_echo flag)', async () => {
    const before = await admin.from('messages').select('*').eq('chat_id', chatId)
    await postWebhook(delivery('mid-echo-1', 'Bisa kak, COD tersedia.', { is_echo: true }))
    const after = await admin.from('messages').select('*').eq('chat_id', chatId)
    expect(after.data).toHaveLength(before.data.length)
  })

  it('removes a message that Meta reports deleted', async () => {
    await postWebhook(delivery('mid-to-delete', 'salah kirim'))
    const stored = await admin.from('messages').select('*').eq('platform_message_id', 'mid-to-delete')
    expect(stored.data).toHaveLength(1)
    await postWebhook(delivery('mid-to-delete', undefined, { is_deleted: true }))
    const gone = await admin.from('messages').select('*').eq('platform_message_id', 'mid-to-delete')
    expect(gone.data).toHaveLength(0)
  })

  it('rejects the same request without a token', async () => {
    const response = await fetch(`${apiUrl}/api/chats`)
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'sign in first' })
  })

  it('clears the unread badge when the thread is opened', async () => {
    const response = await fetch(`${apiUrl}/api/chats/${chatId}`, { headers: { authorization: `Bearer ${accessToken}` } })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.messages.map((message) => message.direction)).toEqual(['in', 'out'])
    const chat = await admin.from('chats').select('unread').eq('id', chatId).single()
    expect(chat.data.unread).toBe(0)
  })

  it('sends a manual reply inside the window', async () => {
    const response = await fetch(`${apiUrl}/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'Alamatnya mana kak?' }),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({ direction: 'out', text: 'Alamatnya mana kak?', repliedBy: 'manual' })
    expect(graphCalls.filter((call) => call.body?.message?.text == 'Alamatnya mana kak?')).toHaveLength(1)
  })

  it('refuses to send once the 24-hour window has closed', async () => {
    await admin
      .from('chats')
      .update({ last_inbound_at: new Date(Date.now() - 25 * 3600000).toISOString() })
      .eq('id', chatId)
    const before = graphCalls.length
    const response = await fetch(`${apiUrl}/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'Masih di luar jendela' }),
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'the 24-hour reply window has closed' })
    expect(graphCalls.length).toBe(before)
  })

  it('does not let another signed-in user read this conversation', async () => {
    const email = `intruder-${Date.now()}@jawabin.test`
    const password = 'intruder-password-123'
    const other = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    const otherSession = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } })
    const signed = await otherSession.auth.signInWithPassword({ email, password })
    const response = await fetch(`${apiUrl}/api/chats/${chatId}`, {
      headers: { authorization: `Bearer ${signed.data.session.access_token}` },
    })
    expect(response.status).toBe(404)
    await admin.auth.admin.deleteUser(other.data.user.id)
  })

  it('keeps the database constraints honest', async () => {
    const badChannel = await admin.from('rules').insert({
      user_id: userId,
      name: 'salah kanal',
      type: 'keyword',
      channel: 'sms',
      keywords: ['x'],
      reply: 'y',
    })
    expect(badChannel.error?.code, 'rules.channel check').toBe('23514')

    const duplicate = await admin.from('messages').insert({
      user_id: userId,
      chat_id: chatId,
      direction: 'in',
      text: 'duplikat',
      platform_message_id: 'mid-live-1',
    })
    expect(duplicate.error?.code, 'messages.platform_message_id unique').toBe('23505')
  })
})
