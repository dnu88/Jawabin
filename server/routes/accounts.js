import { HttpError, json, redirect } from '../http.js'
import { db, check } from '../db.js'
import { readState, signState } from '../crypto.js'
import { authorizeUrl, connect, loginMode, subscribeAccount } from '../instagram.js'
import { checkAccounts } from '../accounthealth.js'
import { logActivity } from '../activity.js'

const accountDoc = (row) => ({
  _id: row.id, platform: row.platform, username: row.username, name: row.name, picture: row.picture,
  createdAt: row.created_at, tokenExpiresAt: row.token_expires_at,
})
const callbackUrl = (url) => `${url.origin}/api/instagram/callback`

export async function listAccounts(user) {
  const rows = check(await db().from('accounts').select('*').eq('user_id', user.id).order('created_at'))
  return json(rows.map(accountDoc))
}

// Subscription diagnostics for the account page: verifies the account-level
// webhook subscription, repairs it when it is missing, and answers from the last
// five minutes unless ?force=1 asks for a fresh Graph call.
export async function accountsHealth(user, _body, url) {
  const rows = check(await db().from('accounts').select('*').eq('user_id', user.id).order('created_at'))
  return json(await checkAccounts(rows, { force: url.searchParams.get('force') == '1' }))
}

// Scheduled pass over every connected account (Vercel cron, daily on Hobby).
export async function allAccountsHealth() {
  const rows = check(await db().from('accounts').select('*'))
  const results = await checkAccounts(rows, { force: true })
  return json({ checked: results.length, results })
}

export async function deleteAccount(user, _body, _url, id) {
  check(await db().from('accounts').delete().eq('user_id', user.id).eq('id', id))
  return json({ ok: true })
}

export async function instagramAuthorize(user, _body, url) {
  const mode = loginMode()
  return json({ url: authorizeUrl(callbackUrl(url), signState({ userId: user.id, authMode: mode }), mode) })
}

// Instagram sends the browser back here, so the user comes from the signed state.
export async function instagramCallback(url) {
  const back = (query) => redirect(`${url.origin}/user/account?${new URLSearchParams(query)}`)
  try {
    if (url.searchParams.get('error')) throw new HttpError(400, 'Instagram connection was cancelled; please try again')
    // Old in-flight states predate authMode and must still use Instagram Login.
    const { userId, authMode = 'instagram_login' } = readState(url.searchParams.get('state'))
    if (!userId || !['instagram_login', 'unified_login'].includes(authMode)) throw new HttpError(400, 'invalid state')
    const code = String(url.searchParams.get('code') || '').replace(/#_$/, '')
    if (!code.trim()) throw new HttpError(400, 'missing authorization code')
    const accounts = await connect(code, callbackUrl(url), authMode)
    // A single transaction checks the complete set before writing anything. The
    // SQL also guards ON CONFLICT, so a concurrent callback cannot steal a row.
    const { error } = await db().rpc('connect_instagram_accounts', { p_user_id: userId, p_accounts: accounts })
    if (error) throw new HttpError(400, error.code === '42501'
      ? 'this Instagram account is connected to another Jawabin user'
      : error.code === 'P0002'
        ? 'switching Instagram login methods is not supported yet; your existing connection is unchanged'
        : 'Instagram accounts could not be saved; please connect again')
    // Persist first: if ownership changes in a competing callback, no external
    // subscription has happened. A subscription failure leaves owned rows in
    // place for a safe idempotent reconnect, not a false success or data deletion.
    try {
      for (const account of accounts) await subscribeAccount(account)
    } catch {
      throw new HttpError(400, 'Instagram webhook subscription failed; please connect again')
    }
    for (const account of accounts) await logActivity(userId, null, { module: 'account', action: 'connect', target: `@${account.username}`, detail: { platform: 'Instagram' } })
    return back({ connected: accounts.map(account => account.username).join(', ') })
  } catch (error) {
    return back({ error: error instanceof HttpError ? error.message : 'Instagram connection failed; please connect again' })
  }
}
