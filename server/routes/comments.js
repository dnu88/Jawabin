import { HttpError, json, pageParams, paged } from '../http.js'
import { db, check } from '../db.js'
import { replyToComment } from '../instagram.js'

const commentDoc = (row) => ({
  _id: row.id, accountId: row.account_id, text: row.text, from: row.from_username, status: row.status,
  replyText: row.reply_text, repliedBy: row.replied_by, error: row.error, createdAt: row.created_at,
  account: row.accounts ? { username: row.accounts.username, platform: row.accounts.platform } : null,
})

async function ownComment(user, id) {
  const row = check(await db().from('comments').select('*, accounts(*)').eq('user_id', user.id).eq('id', id).maybeSingle())
  if (!row) throw new HttpError(404, 'comment not found')
  return row
}

export async function listComments(user, _body, url) {
  const params = pageParams(url)
  let query = db().from('comments').select('*, accounts(username, platform)', { count: 'exact' }).eq('user_id', user.id)
  const status = url.searchParams.get('status')
  if (status) query = query.eq('status', status)
  const { data, count } = check(await query.order('created_at', { ascending: false }).range(params.from, params.to))
  return json(paged(data, count, params, commentDoc))
}

export async function replyComment(user, body, _url, id) {
  const text = String(body.text || '').trim()
  if (!text) throw new HttpError(400, 'reply is required')
  const row = await ownComment(user, id)
  await replyToComment(row.accounts, row.platform_comment_id, text)
  check(await db().from('comments').update({ status: 'resolved', reply_text: text, replied_by: 'manual', error: '' }).eq('id', id))
  return json(commentDoc({ ...row, status: 'resolved', reply_text: text, replied_by: 'manual', error: '' }))
}

export async function updateComment(user, body, _url, id) {
  if (!['pending', 'resolved', 'ignored'].includes(body.status)) throw new HttpError(400, 'unknown status')
  const row = await ownComment(user, id)
  check(await db().from('comments').update({ status: body.status }).eq('id', id))
  return json(commentDoc({ ...row, status: body.status }))
}
