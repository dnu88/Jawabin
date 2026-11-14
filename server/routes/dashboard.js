import { json } from '../http.js'
import { db, check } from '../db.js'

const DAY = 86400000

function startOfToday(now) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  return start
}

async function count(query) {
  const result = check(await query)
  return (result && result.count) || 0
}

async function sumTokens(query) {
  const rows = check(await query)
  return (rows || []).reduce((total, row) => total + (row.token || 0), 0)
}

// Numbers for the dashboard. Every query carries .eq('user_id', …) because the
// service-role client bypasses RLS, and the comments count is the one thing the
// console asks about first, so it is read with head:true and no rows returned.
export async function getDashboard(user) {
  const now = new Date()
  const today = startOfToday(now).toISOString()
  const week = new Date(startOfToday(now).getTime() - 6 * DAY).toISOString()
  const table = (name) => db().from(name).select('id', { count: 'exact', head: true }).eq('user_id', user.id)
  const tokens = (since) => {
    let query = db().from('ai_usage').select('token').eq('user_id', user.id).limit(10000)
    if (since) query = query.gte('created_at', since)
    return sumTokens(query)
  }

  const [commentsToday, commentsWeek, pending, replied, autoReplied, accounts, tokensWeek, tokensTotal] = await Promise.all([
    count(table('comments').gte('created_at', today)),
    count(table('comments').gte('created_at', week)),
    count(table('comments').eq('status', 'pending')),
    count(table('comments').eq('status', 'resolved')),
    count(table('comments').in('replied_by', ['rule', 'ai'])),
    count(table('accounts')),
    tokens(week),
    tokens(null),
  ])

  return json({
    range: { from: week, to: now.toISOString(), days: 7 },
    commentsToday,
    commentsWeek,
    pending,
    replied,
    autoReplied,
    autoRate: replied ? Math.round((autoReplied / replied) * 1000) / 1000 : 0,
    tokensWeek,
    tokensTotal,
    accounts,
  })
}
