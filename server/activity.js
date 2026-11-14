import { json, pageParams, paged } from './http.js'
import { db, check } from './db.js'

// Records what a user did. Never throws: a failed log must not fail the action.
export async function logActivity(userId, request, { module, action, target = '', detail = {}, status = 'success', error = '' }) {
  try {
    await db().from('activities').insert({
      user_id: userId, module, action, status,
      target_label: String(target).slice(0, 200),
      detail,
      error_message: String(error).slice(0, 500),
      user_agent: (request?.headers.get('user-agent') || '').slice(0, 300),
      ip: (request?.headers.get('x-forwarded-for') || '').split(',')[0].trim(),
    })
  } catch (failure) {
    console.error('activity log failed', failure.message)
  }
}

export async function listActivities(user, _body, url) {
  const params = pageParams(url, 30)
  let query = db().from('activities').select('*', { count: 'exact' }).eq('user_id', user.id)
  for (const field of ['module', 'source', 'status']) {
    const value = url.searchParams.get(field)
    if (value) query = query.eq(field, value)
  }
  const fromDate = url.searchParams.get('fromDate')
  if (fromDate) query = query.gte('created_at', fromDate)
  const { data, count } = check(await query.order('created_at', { ascending: false }).range(params.from, params.to))
  const actor = { type: 'owner', name: user.user_metadata?.name || user.email, email: user.email }
  return json(
    paged(data, count, params, (row) => ({
      _id: row.id, module: row.module, action: row.action, status: row.status, source: row.source,
      target: row.target_label ? { label: row.target_label } : null,
      detail: row.detail, errorMessage: row.error_message, userAgent: row.user_agent, ip: row.ip, actor, createdAt: row.created_at,
    })),
  )
}
