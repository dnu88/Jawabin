import { HttpError, env } from './http.js'
import { db, check } from './db.js'
import { decrypt, encrypt } from './crypto.js'

// Optional override so integration tests can point at a local stand-in. In
// production this stays unset and every call goes to Instagram.
function graph(account) {
  if (authMode(account) === 'unified_login') return 'https://graph.facebook.com/v27.0'
  return process.env.INSTAGRAM_GRAPH_BASE || 'https://graph.instagram.com/v23.0'
}

function authMode(account) {
  const mode = account?.auth_mode || 'instagram_login'
  if (!['instagram_login', 'unified_login'].includes(mode)) throw new HttpError(400, 'unsupported Instagram authentication mode')
  return mode
}

export function loginMode() {
  const mode = process.env.INSTAGRAM_LOGIN_MODE || 'instagram_login'
  if (mode === 'unified') return 'unified_login'
  if (mode === 'instagram_login') return mode
  throw new HttpError(500, 'invalid INSTAGRAM_LOGIN_MODE')
}

function unifiedConfig() {
  const config = { appId: env('META_APP_ID'), secret: env('META_APP_SECRET'), configId: env('META_LOGIN_CONFIG_ID') }
  if (!/^\d+$/.test(config.appId) || !/^\d+$/.test(config.configId)) throw new HttpError(500, 'invalid Meta app or login configuration ID')
  return config
}

const validId = (value) => typeof value === 'string' && /^\d+$/.test(value)
const bearer = (token) => ({ authorization: `Bearer ${token}` })
export const SCOPES = 'instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages'

async function call(url, options = {}) {
  let response
  try {
    response = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(15000) })
  } catch {
    // Fetch errors may include the full URL (including OAuth credentials).
    throw new HttpError(502, 'Instagram did not answer')
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    // Meta answers with {error:{message,type,code,error_subcode,fbtrace_id}}; the
    // numeric code is what tells "outside window" (10/2534022) apart from a token
    // problem, so keep it in the message the UI shows.
    const error = data.error || {}
    const code = [error.code, error.error_subcode].filter((value) => value != null && value !== '').join('/')
    let message = String(error.message || data.error_message || response.status)
    // Meta may reflect request URLs or credentials. Keep diagnostic codes and
    // ordinary provider text, but never return credential values to UI/logs.
    const query = new URL(url).searchParams
    const credentials = [query.get('access_token'), query.get('client_secret'), query.get('code'), options.headers?.authorization?.replace(/^Bearer /, ''), process.env.META_APP_SECRET, process.env.INSTAGRAM_APP_SECRET]
    for (const value of credentials.filter(Boolean)) {
      message = message.replaceAll(value, '[redacted]').replaceAll(encodeURIComponent(value), '[redacted]')
    }
    message = message.replace(/https?:\/\/[^\s]+/g, '[redacted URL]')
    throw new HttpError(400, `Instagram error${code ? ` ${code}` : ''}: ${message}${error.code === 190 ? '; please connect again' : ''}`)
  }
  return data
}

export function authorizeUrl(redirectUri, state, mode = loginMode()) {
  if (mode === 'unified_login') {
    const { appId, configId } = unifiedConfig()
    const query = new URLSearchParams({ client_id: appId, config_id: configId, redirect_uri: redirectUri, response_type: 'code', state, prompt: 'login' })
    return `https://www.facebook.com/dialog/oauth?${query}`
  }
  if (mode !== 'instagram_login') throw new HttpError(400, 'unsupported Instagram authentication mode')
  const query = new URLSearchParams({ client_id: env('INSTAGRAM_APP_ID'), redirect_uri: redirectUri, response_type: 'code', scope: SCOPES, state })
  return `https://www.instagram.com/oauth/authorize?${query}`
}

// Discovery deliberately has no subscription or database side effects. The
// callback must atomically validate ownership of EVERY account before either.
export async function connect(code, redirectUri, mode = loginMode()) {
  if (!code?.trim()) throw new HttpError(400, 'missing authorization code')
  try {
    if (mode === 'unified_login') return await connectUnified(code, redirectUri)
    if (mode === 'instagram_login') return [await connectLegacy(code, redirectUri)]
    throw new Error('invalid mode')
  } catch (error) {
    // Only our validation errors are public; never echo provider envelopes or URLs.
    if (error instanceof HttpError && error.status === 422) throw error
    throw new HttpError(400, 'Instagram connection failed; please connect again')
  }
}

async function connectUnified(code, redirectUri) {
  const { appId, secret, configId } = unifiedConfig()
  const base = graph({ auth_mode: 'unified_login' })
  const exchanged = await call(`${base}/oauth/access_token?${new URLSearchParams({ client_id: appId, client_secret: secret, code, redirect_uri: redirectUri })}`)
  const token = exchanged.access_token
  if (typeof token !== 'string' || !token) throw new HttpError(422, 'invalid Instagram token response')
  let expires = null
  if (Object.hasOwn(exchanged, 'expires_in')) {
    if (typeof exchanged.expires_in !== 'number' || !Number.isFinite(exchanged.expires_in) || exchanged.expires_in <= 0) throw new HttpError(422, 'invalid Instagram token expiry')
    expires = new Date(Date.now() + exchanged.expires_in * 1000).toISOString()
  }
  const options = { headers: bearer(token) }
  const me = await call(`${base}/me?fields=client_business_id`, options)
  if (!validId(me.client_business_id)) throw new HttpError(422, 'invalid Instagram client business response')
  const initial = new URL(`${base}/me/assigned_instagram_accounts?fields=id,username`)
  let next = initial.href
  const visited = new Set()
  const ids = new Set()
  for (let page = 0; next; page++) {
    if (page >= 20 || visited.has(next)) throw new HttpError(422, 'Instagram account pagination exceeded limit')
    visited.add(next)
    const result = await call(next, options)
    if (!Array.isArray(result.data)) throw new HttpError(422, 'invalid Instagram account discovery response')
    for (const item of result.data) {
      if (!validId(item?.id)) throw new HttpError(422, 'invalid Instagram account ID')
      ids.add(item.id)
      if (ids.size > 200) throw new HttpError(422, 'too many Instagram accounts')
    }
    next = null
    if (result.paging?.next != null) {
      let candidate
      try { candidate = new URL(result.paging.next) } catch { throw new HttpError(422, 'invalid Instagram pagination URL') }
      if (candidate.origin !== initial.origin || candidate.pathname !== initial.pathname || candidate.username || candidate.password || candidate.hash) throw new HttpError(422, 'unsafe Instagram pagination URL')
      // Paging URLs often include the token. Use the bearer header instead.
      candidate.searchParams.delete('access_token')
      next = candidate.href
    }
  }
  if (!ids.size) throw new HttpError(422, 'no Instagram accounts were shared; please connect again')
  const encrypted = encrypt(token)
  const accounts = []
  for (const id of ids) {
    const profile = await call(`${base}/${id}?fields=id,username,name,profile_picture_url`, options)
    if (profile.id !== id || typeof profile.username !== 'string' || !profile.username) throw new HttpError(422, 'invalid Instagram profile response')
    accounts.push({ platform_user_id: id, username: profile.username, name: profile.name || '', picture: profile.profile_picture_url || '', access_token_encrypted: encrypted, token_expires_at: expires, auth_mode: 'unified_login', client_business_id: me.client_business_id, login_config_id: configId })
  }
  return accounts
}

// Legacy Instagram Login keeps its original exchange and refresh lifecycle.
async function connectLegacy(code, redirectUri) {
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
  const me = await call(`${graph()}/me?${new URLSearchParams({ fields: 'user_id,username,name,profile_picture_url', access_token: token })}`)
  if (!validId(String(me.user_id || '')) || !token) throw new HttpError(422, 'invalid Instagram profile response')
  return {
    auth_mode: 'instagram_login', client_business_id: null, login_config_id: null,
    platform_user_id: String(me.user_id),
    username: me.username || '',
    name: me.name || '',
    picture: me.profile_picture_url || '',
    access_token_encrypted: encrypt(token),
    token_expires_at: new Date(Date.now() + (long.expires_in || 5184000) * 1000).toISOString(),
  }
}

function storedToken(account) {
  if (authMode(account) === 'unified_login' && account.token_expires_at != null) {
    const expires = new Date(account.token_expires_at).getTime()
    if (!Number.isFinite(expires) || expires <= Date.now()) throw new HttpError(400, 'Instagram access expired; please connect again')
  }
  return decrypt(account.access_token_encrypted)
}

async function reloadAccountToken(account) {
  let result
  try {
    result = await db().from('accounts').select('*').eq('id', account.id).maybeSingle()
  } catch {
    throw new HttpError(503, 'Instagram connection could not be loaded; please try again')
  }
  if (result.error) throw new HttpError(503, 'Instagram connection could not be loaded; please try again')
  const active = result.data
  if (!active || active.user_id !== account.user_id || active.platform_user_id !== account.platform_user_id) throw new HttpError(400, 'Instagram connection changed; please connect again')
  // Callers choose host/path AFTER this await. Keep the token and its routing
  // metadata together, including a winning reconnect's auth family.
  Object.assign(account, active)
  return storedToken(account)
}

// Renew legacy tokens within a week, but never overwrite a concurrent reconnect
// or refresh. Unified tokens have a different lifecycle and are never refreshed.
export async function accountToken(account) {
  const originalCiphertext = account.access_token_encrypted
  const mode = authMode(account)
  const token = storedToken(account)
  const expires = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0
  if (mode === 'unified_login' || expires - Date.now() > 7 * 86400000) return token
  let fresh
  try {
    fresh = await call(`https://graph.instagram.com/refresh_access_token?${new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: token })}`)
  } catch {
    // Preserve legacy provider-failure fallback only after reloading the active
    // connection; a delayed failure must not return a displaced legacy token.
    return reloadAccountToken(account)
  }
  if (typeof fresh.access_token !== 'string' || !fresh.access_token || typeof fresh.expires_in !== 'number' || !Number.isFinite(fresh.expires_in) || fresh.expires_in <= 0) throw new HttpError(502, 'invalid Instagram refresh response; please connect again')
  const changes = { access_token_encrypted: encrypt(fresh.access_token), token_expires_at: new Date(Date.now() + fresh.expires_in * 1000).toISOString() }
  let result
  try {
    result = await db().from('accounts').update(changes)
      .eq('id', account.id).eq('auth_mode', mode).eq('access_token_encrypted', originalCiphertext).select('*')
  } catch {
    throw new HttpError(503, 'Instagram refreshed connection could not be saved; please try again')
  }
  if (result.error || !Array.isArray(result.data)) throw new HttpError(503, 'Instagram refreshed connection could not be saved; please try again')
  if (!result.data.length) return reloadAccountToken(account)
  Object.assign(account, result.data[0])
  return storedToken(account)
}

// Where the account-level webhook subscription lives, and for which app id.
function subscriptionBase(account) {
  const unified = authMode(account) === 'unified_login'
  const node = unified ? account.platform_user_id : 'me'
  return {
    appId: env(unified ? 'META_APP_ID' : 'INSTAGRAM_APP_ID'),
    base: `${graph(account)}/${encodeURIComponent(node)}/subscribed_apps`,
  }
}

// Reads which app fields are actually subscribed for this account. Meta sends
// nothing at all when this readback is empty, so it is the only cheap way to
// tell "not subscribed" apart from "Meta chose not to deliver".
async function subscribedApps(base, token, appId) {
  const readback = await call(base, { headers: bearer(token) })
  const apps = Array.isArray(readback.data) ? readback.data : []
  // Meta has answered with `id` on some versions and `app_id` on others.
  const mine = apps.find((app) => String(app.id ?? app.app_id ?? '') === appId)
  const fields = Array.isArray(mine?.subscribed_fields) ? mine.subscribed_fields : []
  return {
    subscribed: Boolean(mine) && ['comments', 'messages'].every((field) => fields.includes(field)),
    fields,
    apps: apps.map((app) => ({ id: String(app.id ?? app.app_id ?? ''), fields: Array.isArray(app.subscribed_fields) ? app.subscribed_fields : [] })),
    raw: apps,
  }
}

// The professional account type decides which APIs exist at all: messaging is
// only available for BUSINESS accounts, so a MEDIA_CREATOR account can have a
// perfect subscription and still receive nothing.
export async function accountProfile(account) {
  const token = await accountToken(account)
  const unified = authMode(account) === 'unified_login'
  const node = unified ? account.platform_user_id : 'me'
  const data = await call(`${graph(account)}/${encodeURIComponent(node)}?fields=username,account_type`, { headers: bearer(token) })
  return { username: typeof data.username === 'string' ? data.username : '', accountType: typeof data.account_type === 'string' ? data.account_type : '' }
}

export async function subscriptionState(account) {
  const token = await accountToken(account)
  const { appId, base } = subscriptionBase(account)
  return { appId, ...(await subscribedApps(base, token, appId)) }
}

// Applies the subscription and proves it by reading back. The failure message
// keeps what Meta actually answered, because the health check has to be able to
// show a reason; the connect flow below replaces it with user-facing text.
export async function applySubscription(account) {
  const token = await accountToken(account)
  const { appId, base } = subscriptionBase(account)
  const result = await call(`${base}?subscribed_fields=comments,messages`, { method: 'POST', headers: bearer(token) })
  const state = await subscribedApps(base, token, appId)
  if (result.success !== true || !state.subscribed) {
    // The readback is what proves the subscription, so the failure names the
    // app ids Meta returned: an empty list and a list under another app id mean
    // completely different things.
    const seen = JSON.stringify(state.raw).slice(0, 280)
    throw new HttpError(400, `subscription not applied (success=${result.success === true}, expected app ${appId}, got ${seen})`)
  }
  return state
}

// Subscribes and proves it by reading back; both the connect flow and the
// scheduled health check use this so a silent half-subscription cannot pass.
export async function subscribeAccount(account) {
  try {
    return await applySubscription(account)
  } catch {
    throw new HttpError(400, 'Instagram webhook subscription failed; please connect again')
  }
}

export async function replyToComment(account, commentId, message) {
  const token = await accountToken(account)
  return call(`${graph(account)}/${encodeURIComponent(commentId)}/replies`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ message }),
  })
}

// Sends a direct message. recipientId is the Instagram-scoped id of the person
// who wrote to us; Meta only accepts it inside the 24-hour reply window.
export async function sendMessage(account, recipientId, text) {
  const token = await accountToken(account)
  return call(`${graph(account)}/${authMode(account) === 'unified_login' ? encodeURIComponent(account.platform_user_id) : 'me'}/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ recipient: { id: String(recipientId) }, message: { text } }),
  })
}
