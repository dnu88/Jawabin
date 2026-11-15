import { beforeEach, describe, expect, it, vi } from 'vitest'

// Route handlers are faked so this file tests only what api/index.js owns:
// path parsing, dispatch, auth gate, error translation.
const spies = vi.hoisted(() => {
  const make = () => ({
    getAi: vi.fn(async () => new Response('{"hit":"getAi"}', { status: 200 })),
    putAi: vi.fn(async () => new Response('{"hit":"putAi"}', { status: 200 })),
    getUsage: vi.fn(async () => new Response('{"hit":"getUsage"}', { status: 200 })),
    getUsageSummary: vi.fn(async () => new Response('{"hit":"getUsageSummary"}', { status: 200 })),
  })
  return {
    ai: make(),
    getUser: vi.fn(),
    activity: {
      logActivity: vi.fn(async () => {}),
      listActivities: vi.fn(async () => new Response('{"hit":"listActivities"}')),
    },
    profile: {
      getProfile: vi.fn(async () => new Response('{"hit":"getProfile"}')),
      putNotification: vi.fn(async () => new Response('{"hit":"putNotification"}')),
      deleteProfile: vi.fn(async () => new Response('{"hit":"deleteProfile"}')),
    },
    accounts: {
      listAccounts: vi.fn(async () => new Response('{"hit":"listAccounts"}')),
      deleteAccount: vi.fn(async () => new Response('{"hit":"deleteAccount"}')),
      instagramAuthorize: vi.fn(async () => new Response('{"hit":"instagramAuthorize"}')),
      instagramCallback: vi.fn(async () => new Response('{"hit":"instagramCallback"}')),
    },
    comments: {
      listComments: vi.fn(async () => new Response('{"hit":"listComments"}')),
      updateComment: vi.fn(async () => new Response('{"hit":"updateComment"}')),
      replyComment: vi.fn(async () => new Response('{"hit":"replyComment"}')),
    },
    rules: {
      listRules: vi.fn(async () => new Response('{"hit":"listRules"}')),
      createRule: vi.fn(async () => new Response('{"hit":"createRule"}')),
      updateRule: vi.fn(async () => new Response('{"hit":"updateRule"}')),
      deleteRule: vi.fn(async () => new Response('{"hit":"deleteRule"}')),
    },
    webhook: {
      verifyWebhook: vi.fn(async () => new Response('{"hit":"verifyWebhook"}')),
      receiveWebhook: vi.fn(async () => new Response('{"hit":"receiveWebhook"}')),
    },
    throwing: vi.fn(),
  }
})

vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser: spies.getUser } }) }))
vi.mock('../../server/routes/ai.js', () => spies.ai)
vi.mock('../../server/routes/accounts.js', () => spies.accounts)
vi.mock('../../server/routes/comments.js', () => spies.comments)
vi.mock('../../server/routes/rules.js', () => spies.rules)
vi.mock('../../server/routes/webhook.js', () => spies.webhook)
vi.mock('../../server/activity.js', () => spies.activity)
vi.mock('../../server/routes/profile.js', () => spies.profile)

const api = await import('../../api/index.js')

const call = (method, path, { token = 'good-token', body } = {}) => {
  const headers = {}
  if (token) headers.authorization = `Bearer ${token}`
  if (body !== undefined) headers['content-type'] = 'application/json'
  const request = new Request(`https://jawabin.test${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const handler = { GET: api.GET, POST: api.POST, PUT: api.PUT, DELETE: api.DELETE }[method]
  return handler(request)
}

beforeEach(() => {
  vi.clearAllMocks()
  spies.getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@b.c' } }, error: null })
})

describe('public routes', () => {
  it('answers /api/health without a session', async () => {
    const response = await call('GET', '/api/health', { token: null })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('passes the whole URL to the webhook handshake so hub.* params survive', async () => {
    const response = await call('GET', '/api/webhook/meta?hub.mode=subscribe&hub.verify_token=t&hub.challenge=42', { token: null })
    expect(response.status).toBe(200)
    const url = spies.webhook.verifyWebhook.mock.calls[0][0]
    expect(url.searchParams.get('hub.challenge')).toBe('42')
  })

  it('sends POSTs on the webhook path to receiveWebhook', async () => {
    await call('POST', '/api/webhook/meta', { token: null, body: { object: 'instagram' } })
    expect(spies.webhook.receiveWebhook).toHaveBeenCalledTimes(1)
  })

  it('lets the Instagram callback through without a session', async () => {
    await call('GET', '/api/instagram/callback?code=abc&state=s', { token: null })
    expect(spies.accounts.instagramCallback).toHaveBeenCalledTimes(1)
  })
})

describe('auth gate', () => {
  it('rejects a private route without a token', async () => {
    const response = await call('GET', '/api/ai', { token: null })
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'sign in first' })
    expect(spies.ai.getAi).not.toHaveBeenCalled()
  })

  it('rejects an expired session with a 401', async () => {
    spies.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'expired' } })
    const response = await call('GET', '/api/ai')
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'session expired, sign in again' })
  })

  it('passes the resolved user to the handler', async () => {
    await call('GET', '/api/ai')
    expect(spies.ai.getAi.mock.calls[0][0]).toEqual({ id: 'user-1', email: 'a@b.c' })
  })
})

describe('dispatch', () => {
  it('reads the route from the __path rewrite query', async () => {
    await call('GET', '/api/index?__path=ai/usage&page=2&limit=5')
    expect(spies.ai.getUsage).toHaveBeenCalledTimes(1)
    expect(spies.ai.getUsage.mock.calls[0][2].searchParams.get('page')).toBe('2')
  })

  it('falls back to the real pathname when __path is absent', async () => {
    await call('GET', '/api/rules')
    expect(spies.rules.listRules).toHaveBeenCalledTimes(1)
  })

  it('tolerates leading and trailing slashes', async () => {
    await call('GET', '/api/ai/')
    expect(spies.ai.getAi).toHaveBeenCalledTimes(1)
    await call('GET', '/api//accounts')
    expect(spies.accounts.listAccounts).toHaveBeenCalledTimes(1)
  })

  it('resolves the longest literal paths before the shorter ones', async () => {
    await call('GET', '/api/ai/usage/summary')
    expect(spies.ai.getUsageSummary).toHaveBeenCalledTimes(1)
    expect(spies.ai.getUsage).not.toHaveBeenCalled()
    expect(spies.ai.getAi).not.toHaveBeenCalled()
  })

  it('passes :id to update, reply and delete handlers', async () => {
    await call('PUT', '/api/rules/rule-9', { body: { name: 'x' } })
    expect(spies.rules.updateRule.mock.calls[0][3]).toBe('rule-9')

    await call('POST', '/api/comments/comment-7/reply', { body: { text: 'halo' } })
    expect(spies.comments.replyComment.mock.calls[0][3]).toBe('comment-7')
    expect(spies.comments.replyComment.mock.calls[0][1]).toEqual({ text: 'halo' })

    await call('DELETE', '/api/accounts/acc-2')
    expect(spies.accounts.deleteAccount.mock.calls[0][3]).toBe('acc-2')
  })

  it('parses a JSON body for POST and PUT only', async () => {
    await call('PUT', '/api/ai', { body: { type: 'gemini', model: 'm' } })
    expect(spies.ai.putAi.mock.calls[0][1]).toEqual({ type: 'gemini', model: 'm' })
    await call('GET', '/api/ai')
    expect(spies.ai.getAi.mock.calls[0][1]).toEqual({})
  })

  it('accepts an empty body on write routes', async () => {
    const request = new Request('https://jawabin.test/api/rules', {
      method: 'POST',
      headers: { authorization: 'Bearer good-token' },
    })
    const response = await api.POST(request)
    expect(response.status).toBe(200)
    expect(spies.rules.createRule.mock.calls[0][1]).toEqual({})
  })

  it('404s an unknown path and a method mismatch', async () => {
    expect((await call('GET', '/api/does-not-exist')).status).toBe(404)
    expect(await (await call('GET', '/api/does-not-exist')).json()).toEqual({ error: 'not found' })
    expect((await call('DELETE', '/api/ai')).status).toBe(404)
    expect((await call('POST', '/api/comments')).status).toBe(404)
  })
})

describe('error translation', () => {
  it('turns a thrown HttpError into its status and message', async () => {
    const { HttpError } = await import('../../server/http.js')
    spies.ai.getAi.mockRejectedValueOnce(new HttpError(400, 'model is required'))
    const response = await call('GET', '/api/ai')
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'model is required' })
  })

  it('hides unexpected errors behind a 500 and logs them', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    spies.ai.getAi.mockRejectedValueOnce(new Error('boom: database password is hunter2'))
    const response = await call('GET', '/api/ai')
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'something went wrong' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('activity log', () => {
  it('records a successful change with its module and action', async () => {
    const response = await call('PUT', '/api/profile/notification', { body: { expired: true } })
    expect(response.status).toBe(200)
    expect(spies.activity.logActivity).toHaveBeenCalledTimes(1)
    const [userId, , entry] = spies.activity.logActivity.mock.calls[0]
    expect(userId).toBe('user-1')
    expect(entry).toEqual({ module: 'setting', action: 'update_notification' })
  })

  it('records a failed change as failed and still returns the error', async () => {
    spies.rules.createRule.mockRejectedValueOnce(Object.assign(new Error('name is required'), { status: 400 }))
    const response = await call('POST', '/api/rules', { body: {} })
    expect(response.status).not.toBe(200)
    const [, , entry] = spies.activity.logActivity.mock.calls[0]
    expect(entry).toMatchObject({ module: 'automation', action: 'create', status: 'failed', error: 'name is required' })
  })

  it('does not record reads', async () => {
    await call('GET', '/api/rules')
    await call('GET', '/api/activities')
    expect(spies.activity.logActivity).not.toHaveBeenCalled()
  })
})

describe('account deletion', () => {
  it('needs a session', async () => {
    const response = await call('POST', '/api/profile/delete', { token: null, body: { confirm: 'a@b.c' } })
    expect(response.status).toBe(401)
    expect(spies.profile.deleteProfile).not.toHaveBeenCalled()
  })

  it('passes the signed-in user and the typed confirmation to the handler', async () => {
    await call('POST', '/api/profile/delete', { body: { confirm: 'a@b.c' } })
    const [user, body] = spies.profile.deleteProfile.mock.calls[0]
    expect(user.id).toBe('user-1')
    expect(body).toEqual({ confirm: 'a@b.c' })
  })
})
