import { HttpError, json } from '../http.js'
import { db, check } from '../db.js'

const ruleDoc = (row) => ({
  _id: row.id, accountId: row.account_id || '', name: row.name, type: row.type, keywords: row.keywords,
  reply: row.reply, prompt: row.prompt, isActive: row.is_active, createdAt: row.created_at,
})

async function clean(user, body) {
  const type = body.type == 'ai' ? 'ai' : 'keyword'
  const values = {
    name: String(body.name || '').trim().slice(0, 80),
    type,
    keywords: type == 'keyword' ? (body.keywords || []).map((word) => String(word).trim()).filter(Boolean).slice(0, 30) : [],
    reply: type == 'keyword' ? String(body.reply || '').trim().slice(0, 1000) : '',
    prompt: type == 'ai' ? String(body.prompt || '').trim().slice(0, 4000) : '',
    is_active: body.isActive !== false,
    account_id: body.accountId || null,
  }
  if (!values.name) throw new HttpError(400, 'name is required')
  if (type == 'keyword' && (!values.keywords.length || !values.reply)) throw new HttpError(400, 'keywords and reply are required')
  if (type == 'ai' && !values.prompt) throw new HttpError(400, 'instructions are required')
  if (values.account_id) {
    const account = check(await db().from('accounts').select('id').eq('user_id', user.id).eq('id', values.account_id).maybeSingle())
    if (!account) throw new HttpError(400, 'account not found')
  }
  return values
}

export async function listRules(user) {
  return json(check(await db().from('rules').select('*').eq('user_id', user.id).order('created_at')).map(ruleDoc))
}

export async function createRule(user, body) {
  const row = check(await db().from('rules').insert({ ...(await clean(user, body)), user_id: user.id }).select().single())
  return json(ruleDoc(row))
}

export async function updateRule(user, body, _url, id) {
  const row = check(await db().from('rules').update(await clean(user, body)).eq('user_id', user.id).eq('id', id).select().maybeSingle())
  if (!row) throw new HttpError(404, 'rule not found')
  return json(ruleDoc(row))
}

export async function deleteRule(user, _body, _url, id) {
  check(await db().from('rules').delete().eq('user_id', user.id).eq('id', id))
  return json({ ok: true })
}
