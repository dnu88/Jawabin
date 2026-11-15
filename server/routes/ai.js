import { HttpError, json, pageParams, paged } from '../http.js'
import { db, check } from '../db.js'
import { encrypt } from '../crypto.js'
import { checkEndpoint, generate, loadSettings, logUsage, providerTypes } from '../ai.js'

const usageDoc = (row) => ({ _id: row.id, type: row.type, token: row.token, createdAt: row.created_at, data: JSON.stringify(row.data) })

export async function getAi(user) {
  const row = check(await db().from('ai_settings').select('type, url, model, token_hint').eq('user_id', user.id).maybeSingle())
  return json({ type: row?.type || 'gemini', url: row?.url || '', model: row?.model || '', tokenHint: row?.token_hint || '', isProvided: false })
}

// Saves only after one test request with the key and model succeeds.
export async function putAi(user, body) {
  const type = String(body.type || '')
  const model = String(body.model || '').trim()
  let token = String(body.token || '').trim()
  if (body.isProvided) throw new HttpError(400, 'Jawabin tokens are not available yet, use your own API key')
  if (!providerTypes.includes(type)) throw new HttpError(400, 'unknown provider')
  if (!model) throw new HttpError(400, 'model is required')
  const url = ['openai', '9router'].includes(type) && body.url ? await checkEndpoint(String(body.url)) : ''
  if (!token) token = (await loadSettings(user.id))?.token || ''
  if (!token) throw new HttpError(400, 'API key is required')

  const result = await generate({ type, url, model, token }, { user: 'Reply with the single word: pong' })
  await logUsage(user.id, 'validate', result)
  check(
    await db().from('ai_settings').upsert({
      user_id: user.id, type, url, model,
      token_encrypted: encrypt(token),
      token_hint: token.slice(-4),
      updated_at: new Date().toISOString(),
    }),
  )
  return getAi(user)
}

export async function getUsage(user, _body, url) {
  const params = pageParams(url)
  const { data, count } = check(
    await db().from('ai_usage').select('*', { count: 'exact' }).eq('user_id', user.id).order('created_at', { ascending: false }).range(params.from, params.to),
  )
  return json(paged(data, count, params, usageDoc))
}

export async function getUsageSummary(user) {
  const rows = check(await db().from('ai_usage').select('type, token').eq('user_id', user.id).limit(10000))
  const summary = { total: 0, content: 0, chat: 0, validate: 0 }
  for (const row of rows) {
    summary[row.type] += row.token
    summary.total += row.token
  }
  return json(summary)
}
