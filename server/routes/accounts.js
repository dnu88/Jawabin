import { HttpError, json, redirect } from '../http.js'
import { db, check } from '../db.js'
import { readState, signState } from '../crypto.js'
import { authorizeUrl, connect } from '../instagram.js'

const accountDoc = (row) => ({
  _id: row.id, platform: row.platform, username: row.username, name: row.name, picture: row.picture,
  createdAt: row.created_at, tokenExpiresAt: row.token_expires_at,
})
const callbackUrl = (url) => `${url.origin}/api/instagram/callback`

export async function listAccounts(user) {
  const rows = check(await db().from('accounts').select('*').eq('user_id', user.id).order('created_at'))
  return json(rows.map(accountDoc))
}

export async function deleteAccount(user, _body, _url, id) {
  check(await db().from('accounts').delete().eq('user_id', user.id).eq('id', id))
  return json({ ok: true })
}

export async function instagramAuthorize(user, _body, url) {
  return json({ url: authorizeUrl(callbackUrl(url), signState({ userId: user.id })) })
}

// Instagram sends the browser back here, so the user comes from the signed state.
export async function instagramCallback(url) {
  const back = (query) => redirect(`${url.origin}/user/account?${new URLSearchParams(query)}`)
  try {
    if (url.searchParams.get('error')) throw new HttpError(400, url.searchParams.get('error_description') || 'connection was cancelled')
    const { userId } = readState(url.searchParams.get('state'))
    const account = await connect(String(url.searchParams.get('code') || '').replace(/#_$/, ''), callbackUrl(url))
    const existing = check(await db().from('accounts').select('user_id').eq('platform', 'instagram').eq('platform_user_id', account.platform_user_id).maybeSingle())
    if (existing && existing.user_id != userId) throw new HttpError(400, 'this Instagram account is connected to another Jawabin user')
    check(await db().from('accounts').upsert({ ...account, user_id: userId, platform: 'instagram' }, { onConflict: 'platform,platform_user_id' }))
    return back({ connected: account.username })
  } catch (error) {
    return back({ error: error.message })
  }
}
