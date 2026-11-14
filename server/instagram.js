import { HttpError, env } from './http.js'
import { db, check } from './db.js'
import { decrypt, encrypt } from './crypto.js'

const GRAPH = 'https://graph.instagram.com/v23.0'
export const SCOPES = 'instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages'

async function call(url, options = {}) {
  let response
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) })
  } catch (error) {
    throw new HttpError(502, `Instagram did not answer: ${error.message}`)
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new HttpError(400, `Instagram error: ${data.error?.message || data.error_message || response.status}`)
  return data
}

export function authorizeUrl(redirectUri, state) {
  const query = new URLSearchParams({ client_id: env('INSTAGRAM_APP_ID'), redirect_uri: redirectUri, response_type: 'code', scope: SCOPES, state })
  return `https://www.instagram.com/oauth/authorize?${query}`
}

// Exchanges the OAuth code for a 60-day token and reads the account profile.
export async function connect(code, redirectUri) {
  const form = new URLSearchParams({
    client_id: env('INSTAGRAM_APP_ID'),
    client_secret: env('INSTAGRAM_APP_SECRET'),
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code,
  })
  const short = await call('https://api.instagram.com/oauth/access_token', { method: 'POST', body: form })
  const long = await call(
    `https://graph.instagram.com/access_token?${new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: env('INSTAGRAM_APP_SECRET'), access_token: short.access_token })}`,
  )
  const token = long.access_token
  const me = await call(`${GRAPH}/me?${new URLSearchParams({ fields: 'user_id,username,name,profile_picture_url', access_token: token })}`)
  // Ask Instagram to send this account's comment and message events to our webhook.
  await call(`${GRAPH}/me/subscribed_apps?${new URLSearchParams({ subscribed_fields: 'comments,messages', access_token: token })}`, { method: 'POST' })
  return {
    platform_user_id: String(me.user_id),
    username: me.username || '',
    name: me.name || '',
    picture: me.profile_picture_url || '',
    access_token_encrypted: encrypt(token),
    token_expires_at: new Date(Date.now() + (long.expires_in || 5184000) * 1000).toISOString(),
  }
}

// Returns a usable token, renewing it when it expires within a week.
export async function accountToken(account) {
  const token = decrypt(account.access_token_encrypted)
  const expires = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0
  if (expires - Date.now() > 7 * 86400000) return token
  try {
    const fresh = await call(`https://graph.instagram.com/refresh_access_token?${new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: token })}`)
    check(
      await db()
        .from('accounts')
        .update({ access_token_encrypted: encrypt(fresh.access_token), token_expires_at: new Date(Date.now() + fresh.expires_in * 1000).toISOString() })
        .eq('id', account.id),
    )
    return fresh.access_token
  } catch {
    return token
  }
}

export async function replyToComment(account, commentId, message) {
  const token = await accountToken(account)
  return call(`${GRAPH}/${encodeURIComponent(commentId)}/replies`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ message }),
  })
}

// Sends a direct message. recipientId is the Instagram-scoped id of the person
// who wrote to us; Meta only accepts it inside the 24-hour reply window.
export async function sendMessage(account, recipientId, text) {
  const token = await accountToken(account)
  return call(`${GRAPH}/me/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ recipient: { id: String(recipientId) }, message: { text } }),
  })
}
