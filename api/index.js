import { HttpError, json } from '../server/http.js'
import { requireUser } from '../server/db.js'
import { getAi, getUsage, getUsageSummary, putAi } from '../server/routes/ai.js'
import { deleteAccount, instagramAuthorize, instagramCallback, listAccounts } from '../server/routes/accounts.js'
import { listComments, replyComment, updateComment } from '../server/routes/comments.js'
import { createRule, deleteRule, listRules, updateRule } from '../server/routes/rules.js'
import { receiveWebhook, verifyWebhook } from '../server/routes/webhook.js'

// Routes that need a signed-in user: handler(user, body, url, id).
const routes = [
  ['GET', 'ai', getAi],
  ['PUT', 'ai', putAi],
  ['GET', 'ai/usage', getUsage],
  ['GET', 'ai/usage/summary', getUsageSummary],
  ['GET', 'accounts', listAccounts],
  ['DELETE', 'accounts/:id', deleteAccount],
  ['GET', 'instagram/authorize', instagramAuthorize],
  ['GET', 'comments', listComments],
  ['PUT', 'comments/:id', updateComment],
  ['POST', 'comments/:id/reply', replyComment],
  ['GET', 'rules', listRules],
  ['POST', 'rules', createRule],
  ['PUT', 'rules/:id', updateRule],
  ['DELETE', 'rules/:id', deleteRule],
]

function match(pattern, path) {
  const want = pattern.split('/')
  const have = path.split('/')
  if (want.length != have.length) return null
  let id = ''
  for (let i = 0; i < want.length; i++) {
    if (want[i] == ':id') id = have[i]
    else if (want[i] != have[i]) return null
  }
  return { id }
}

async function handle(request) {
  const url = new URL(request.url)
  const path = (url.searchParams.get('__path') ?? url.pathname.replace(/^\/api\/?/, '')).replace(/^\/+|\/+$/g, '')
  const method = request.method

  if (path == 'health') return json({ ok: true })
  if (path == 'webhook/meta') return method == 'GET' ? verifyWebhook(url) : receiveWebhook(request)
  if (path == 'instagram/callback' && method == 'GET') return instagramCallback(url)

  for (const [routeMethod, pattern, handler] of routes) {
    const found = routeMethod == method && match(pattern, path)
    if (!found) continue
    const user = await requireUser(request)
    const body = ['POST', 'PUT'].includes(method) ? await request.json().catch(() => ({})) : {}
    return handler(user, body, url, found.id)
  }
  throw new HttpError(404, 'not found')
}

async function entry(request) {
  try {
    return await handle(request)
  } catch (error) {
    if (!(error instanceof HttpError)) console.error(error)
    return json({ error: error instanceof HttpError ? error.message : 'something went wrong' }, error.status || 500)
  }
}

export const GET = entry
export const POST = entry
export const PUT = entry
export const DELETE = entry
