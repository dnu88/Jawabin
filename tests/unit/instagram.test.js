import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The Graph client is exercised with a stubbed global fetch: this checks the URL,
// headers and body we put on the wire, plus how Meta's error envelope surfaces.
const { encrypt } = await import('../../server/crypto.js')
const { replyToComment, sendMessage, accountToken } = await import('../../server/instagram.js')

const token = encrypt('ig-secret-token')
const account = {
  id: 'acc-1',
  platform_user_id: '17841400000000001',
  access_token_encrypted: token,
  token_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
}

let calls = []
const respond = (body, status = 200) => {
  global.fetch = vi.fn(async (url, options) => {
    calls.push({ url: String(url), method: options?.method || 'GET', headers: options?.headers || {}, body: options?.body })
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  })
}

beforeEach(() => {
  calls = []
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('sendMessage', () => {
  it('posts to /me/messages with the bearer token and Meta body shape', async () => {
    respond({ recipient_id: 'igsid-9', message_id: 'mid-1' })
    const result = await sendMessage(account, 'igsid-9', 'Halo kak')
    expect(result).toEqual({ recipient_id: 'igsid-9', message_id: 'mid-1' })

    const [call] = calls
    expect(call.url).toMatch(/^https:\/\/graph\.instagram\.com\/v\d+\.\d+\/me\/messages$/)
    expect(call.method).toBe('POST')
    expect(call.headers.authorization).toBe('Bearer ig-secret-token')
    expect(JSON.parse(call.body)).toEqual({ recipient: { id: 'igsid-9' }, message: { text: 'Halo kak' } })
  })

  it('honours INSTAGRAM_GRAPH_BASE for the integration stub', async () => {
    const before = process.env.INSTAGRAM_GRAPH_BASE
    process.env.INSTAGRAM_GRAPH_BASE = 'http://127.0.0.1:9999/v23.0'
    respond({ message_id: 'x' })
    await sendMessage(account, 'igsid-9', 'Halo')
    expect(calls[0].url).toBe('http://127.0.0.1:9999/v23.0/me/messages')
    if (before === undefined) delete process.env.INSTAGRAM_GRAPH_BASE
    else process.env.INSTAGRAM_GRAPH_BASE = before
  })

  it('surfaces Meta error code and subcode, which is how "outside window" is identified', async () => {
    respond(
      {
        error: {
          message: 'Essa mensagem foi enviada fora do período permitido.',
          type: 'IGApiException',
          code: 10,
          error_subcode: 2534022,
          fbtrace_id: 'abc',
        },
      },
      400,
    )
    await expect(sendMessage(account, 'igsid-9', 'Halo')).rejects.toThrowError(/Instagram error 10\/2534022: .*fora do período permitido/)
  })

  it('keeps the status when Meta sends no error object', async () => {
    respond({}, 500)
    await expect(sendMessage(account, 'igsid-9', 'Halo')).rejects.toThrowError(/500/)
  })
})

describe('replyToComment', () => {
  it('posts to /<comment-id>/replies', async () => {
    respond({ id: 'reply-1' })
    await replyToComment(account, 'comment-42', 'Terima kasih')
    expect(calls[0].url).toMatch(/\/comment-42\/replies$/)
    expect(JSON.parse(calls[0].body)).toEqual({ message: 'Terima kasih' })
  })
})

describe('accountToken', () => {
  it('reuses the stored token while it is valid for more than a week', async () => {
    await expect(accountToken(account)).resolves.toBe('ig-secret-token')
    expect(calls).toHaveLength(0)
  })
})
