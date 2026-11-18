import { HttpError, env, json } from '../http.js'
import { db, check } from '../db.js'
import { hmac, safeEqual } from '../crypto.js'
import { autoReply } from '../autoreply.js'
import { receiveMessage } from '../chat.js'
import { recordDelivery } from '../webhooklog.js'

// Meta calls this once when the webhook is registered.
export function verifyWebhook(url) {
  const token = url.searchParams.get('hub.verify_token') || ''
  if (url.searchParams.get('hub.mode') != 'subscribe' || !safeEqual(token, env('META_VERIFY_TOKEN'))) throw new HttpError(403, 'verification failed')
  return new Response(url.searchParams.get('hub.challenge') || '', { status: 200 })
}

// Each handler answers with a short reason. The reasons are stored with the
// delivery so "Meta never called us" and "Meta called us for an account we do
// not have" stop looking the same from the outside.
async function handleComment(igUserId, value, modes) {
  if (!value?.id || !value.text) return 'ignored'
  const account = check(await db().from('accounts').select('*').eq('platform', 'instagram').eq('platform_user_id', String(igUserId)).maybeSingle())
  // Skip unknown accounts and the account's own comments (including our replies).
  if (!account) return 'unknown account'
  if (!modes.has(account.auth_mode || 'instagram_login')) return 'mode mismatch'
  if (String(value.from?.id) == account.platform_user_id) return 'own comment'
  const { data: comment, error } = await db()
    .from('comments')
    .insert({
      user_id: account.user_id,
      account_id: account.id,
      platform_comment_id: String(value.id),
      media_id: String(value.media?.id || ''),
      text: String(value.text),
      from_id: String(value.from?.id || ''),
      from_username: String(value.from?.username || ''),
    })
    .select()
    .single()
  if (error) {
    if (error.code == '23505') return 'duplicate' // already stored: Meta retries deliveries
    throw new HttpError(500, error.message)
  }
  // The comment is stored from here on. A reply failure must not make Meta
  // retry: the retry would only hit the duplicate above, and must never risk a
  // second public reply.
  await autoReply(account, comment).catch((error) => console.error('comment reply failed', error.message))
  return 'stored'
}

async function handleMessage(igUserId, value, modes) {
  if (!value?.message?.mid) return 'ignored'
  const account = check(
    await db().from('accounts').select('*').eq('platform', 'instagram').eq('platform_user_id', String(igUserId)).maybeSingle(),
  )
  if (!account) return 'unknown account'
  if (!modes.has(account.auth_mode || 'instagram_login')) return 'mode mismatch'
  const result = await receiveMessage(account, value)
  if (result?.deleted) return 'deleted'
  if (result?.ignored) return 'ignored'
  return 'stored'
}

export async function receiveWebhook(request) {
  // Handler entry, not proof of Meta origin or successful processing.
  console.info('webhook/meta received')
  const raw = await request.text()
  const signature = /^sha256=([a-f0-9]{64})$/.exec(request.headers.get('x-hub-signature-256') || '')?.[1]
  // During migration both app families can deliver to this endpoint. Verify
  // with configured secrets, then only dispatch accounts of the matching family.
  const modes = new Set()
  for (const [mode, name] of [['instagram_login', 'INSTAGRAM_APP_SECRET'], ['unified_login', 'META_APP_SECRET']]) {
    const secret = process.env[name]
    if (signature && secret && safeEqual(signature, hmac(secret, raw))) modes.add(mode)
  }
  const mode = [...modes].join(',')
  if (!modes.size) {
    await recordDelivery({ request, raw, outcome: 'rejected', status: 401, mode, detail: signature ? 'signature did not match a configured secret' : 'no signature header' })
    throw new HttpError(401, 'bad signature')
  }
  let payload
  try {
    payload = JSON.parse(raw)
  } catch (error) {
    await recordDelivery({ request, raw, outcome: 'rejected', status: 500, mode, detail: 'body was not JSON' })
    throw error
  }
  // Storage failures are collected, the rest of the batch is still handled,
  // and then the delivery is answered 500 so Meta retries it. Retrying is safe:
  // stored comments and messages are deduplicated by their platform id.
  const failures = []
  const notes = []
  const record = (kind) => (error) => {
    console.error(`${kind} failed`, error.message)
    failures.push(kind)
    notes.push(`${kind}:failed`)
  }
  let entries = 0
  if (payload.object == 'instagram') {
    for (const entry of payload.entry || []) {
      entries++
      // Documented shape for messaging (Business Login for Instagram): entry[].messaging[].
      for (const event of entry.messaging || []) {
        try {
          notes.push(`message:${await handleMessage(entry.id, event, modes)}`)
        } catch (error) {
          record('message')(error)
        }
      }
      // Comments arrive in changes[]; the Business Login examples also put
      // field/value straight on the entry, so accept both.
      const changes = entry.changes || (entry.field ? [{ field: entry.field, value: entry.value }] : [])
      for (const change of changes) {
        // Older/unified setups wrap messages as a change with field "messages".
        if (change.field == 'messages') {
          try {
            notes.push(`message:${await handleMessage(entry.id, change.value, modes)}`)
          } catch (error) {
            record('message')(error)
          }
          continue
        }
        if (change.field != 'comments' && change.field != 'live_comments') continue
        try {
          notes.push(`comment:${await handleComment(entry.id, change.value, modes)}`)
        } catch (error) {
          record('comment')(error)
        }
      }
    }
  }
  const outcome = failures.length ? 'storage_failed' : notes.length ? 'handled' : 'ignored'
  await recordDelivery({
    request, raw, outcome, status: failures.length ? 500 : 200, mode,
    object: payload.object || null, entries,
    detail: payload.object == 'instagram' ? notes.join(' ') : `object ${payload.object || '(none)'} is not handled here`,
  })
  if (failures.length) throw new HttpError(500, 'webhook storage failed')
  return json({ ok: true })
}
