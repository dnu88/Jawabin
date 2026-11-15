import { HttpError, json } from '../server/http.js'
import { requireUser } from '../server/db.js'
import { getAi, getUsage, getUsageSummary, putAi } from '../server/routes/ai.js'
import { deleteAccount, instagramAuthorize, instagramCallback, listAccounts } from '../server/routes/accounts.js'
import { getDashboard } from '../server/routes/dashboard.js'
import { getChat, listChats, sendChatMessage } from '../server/routes/chats.js'
import { listComments, replyComment, updateComment } from '../server/routes/comments.js'
import { createRule, deleteRule, listRules, updateRule } from '../server/routes/rules.js'
import { receiveWebhook, verifyWebhook } from '../server/routes/webhook.js'
import { deleteProfile, getProfile, putNotification } from '../server/routes/profile.js'
import { listActivities, logActivity } from '../server/activity.js'

// Routes that need a signed-in user: handler(user, body, url, id).
// The optional fourth entry [module, action] records the call in the activity log.
const routes = [
  ['GET', 'dashboard', getDashboard],
  ['GET', 'profile', getProfile],
  ['PUT', 'profile/notification', putNotification, ['setting', 'update_notification']],
  ['POST', 'profile/delete', deleteProfile],
  ['GET', 'activities', listActivities],
  ['GET', 'ai', getAi],
  ['PUT', 'ai', putAi, ['setting', 'update_ai']],
  ['GET', 'ai/usage', getUsage],
  ['GET', 'ai/usage/summary', getUsageSummary],
  ['GET', 'accounts', listAccounts],
  ['DELETE', 'accounts/:id', deleteAccount, ['account', 'delete']],
  ['GET', 'instagram/authorize', instagramAuthorize],
  ['GET', 'comments', listComments],
  ['PUT', 'comments/:id', updateComment, ['comment', 'update_status']],
  ['POST', 'comments/:id/reply', replyComment, ['comment', 'reply']],
  ['GET', 'chats', listChats],
  ['GET', 'chats/:id', getChat],
  ['POST', 'chats/:id/messages', sendChatMessage, ['chat', 'send_message']],
  ['GET', 'rules', listRules],
  ['POST', 'rules', createRule, ['automation', 'create']],
  ['PUT', 'rules/:id', updateRule, ['automation', 'update']],
  ['DELETE', 'rules/:id', deleteRule, ['automation', 'delete']],
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

  for (const [routeMethod, pattern, handler, activity] of routes) {
    const found = routeMethod == method && match(pattern, path)
    if (!found) continue
    const user = await requireUser(request)
    const body = ['POST', 'PUT'].includes(method) ? await request.json().catch(() => ({})) : {}
    if (!activity) return handler(user, body, url, found.id)
    const [module, action] = activity
    try {
      const response = await handler(user, body, url, found.id)
      await logActivity(user.id, request, { module, action })
      return response
    } catch (error) {
      await logActivity(user.id, request, { module, action, status: 'failed', error: error.message })
      throw error
    }
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
