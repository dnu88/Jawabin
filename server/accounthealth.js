import { HttpError } from './http.js'
import { db } from './db.js'
import { subscribeAccount, subscriptionState } from './instagram.js'

// Verifies that Meta is allowed to deliver comments and messages for this
// account, and re-applies the subscription when it is missing. Never throws:
// callers store the outcome instead of failing a page load or a cron run.
export async function checkAccount(account, { repair = true } = {}) {
  let state = null
  let action = 'checked'
  let error = null
  try {
    state = await subscriptionState(account)
    if (!state.subscribed && repair) {
      state = await subscribeAccount(account)
      action = 'resubscribed'
    } else if (!state.subscribed) {
      action = 'missing'
    }
  } catch (failure) {
    // HttpError messages are already redacted by server/instagram.js.
    error = failure instanceof HttpError ? failure.message : 'Instagram did not answer'
    action = 'failed'
  }
  const result = {
    accountId: account.id,
    username: account.username,
    subscribed: Boolean(state?.subscribed),
    fields: state?.fields || [],
    action,
    error,
  }
  try {
    await db().from('account_checks').insert({
      account_id: account.id,
      subscribed: result.subscribed,
      fields: result.fields,
      action: result.action,
      error: result.error,
    })
  } catch (insertError) {
    console.error('account check not recorded', insertError.message)
  }
  return result
}

// Used by the account page so a broken subscription either reports itself or is
// repaired without anyone clicking anything. Cached rows keep repeated page
// loads from calling the Graph API over and over.
export const CACHE_MS = 5 * 60000

export async function checkAccounts(accounts, { force = false } = {}) {
  if (!accounts.length) return []
  const cached = new Map()
  if (!force) {
    try {
      const cutoff = new Date(Date.now() - CACHE_MS).toISOString()
      const { data, error } = await db()
        .from('account_checks')
        .select('account_id, checked_at, subscribed, fields, action, error')
        .in('account_id', accounts.map((account) => account.id))
        .gte('checked_at', cutoff)
        .order('checked_at', { ascending: false })
      if (error) throw error
      for (const row of data || []) if (!cached.has(row.account_id)) cached.set(row.account_id, row)
    } catch (error) {
      console.error('account check cache unreadable', error.message)
    }
  }
  const results = []
  for (const account of accounts) {
    const row = cached.get(account.id)
    if (row) {
      results.push({ accountId: account.id, username: account.username, subscribed: row.subscribed, fields: row.fields || [], action: row.action, error: row.error, cached: true, checkedAt: row.checked_at })
      continue
    }
    results.push(await checkAccount(account))
  }
  return results
}
