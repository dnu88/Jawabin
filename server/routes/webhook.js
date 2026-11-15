import { HttpError, env, json } from '../http.js'
import { db, check } from '../db.js'
import { hmac, safeEqual } from '../crypto.js'
import { autoReply } from '../autoreply.js'
import { receiveMessage } from '../chat.js'

// Meta calls this once when the webhook is registered.
export function verifyWebhook(url) {
  const token = url.searchParams.get('hub.verify_token') || ''
  if (url.searchParams.get('hub.mode') != 'subscribe' || !safeEqual(token, env('META_VERIFY_TOKEN'))) throw new HttpError(403, 'verification failed')
  return new Response(url.searchParams.get('hub.challenge') || '', { status: 200 })
}

async function handleComment(igUserId, value, modes) {
  if (!value?.id || !value.text) return
  const account = check(await db().from('accounts').select('*').eq('platform', 'instagram').eq('platform_user_id', String(igUserId)).maybeSingle())
  // Skip unknown accounts and the account's own comments (including our replies).
  if (!account || !modes.has(account.auth_mode || 'instagram_login') || String(value.from?.id) == account.platform_user_id) return
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
    if (error.code == '23505') return // already stored: Meta retries deliveries
    throw new HttpError(500, error.message)
  }
  // The comment is stored from here on. A reply failure must not make Meta
  // retry: the retry would only hit the duplicate above, and must never risk a
  // second public reply.
  await autoReply(account, comment).catch((error) => console.error('comment reply failed', error.message))
}

async function handleMessage(igUserId, value, modes) {
  if (!value?.message?.mid) return
  const account = check(
    await db().from('accounts').select('*').eq('platform', 'instagram').eq('platform_user_id', String(igUserId)).maybeSingle(),
  )
  if (!account || !modes.has(account.auth_mode || 'instagram_login')) return
  await receiveMessage(account, value)
}

export async function receiveWebhook(request) {
  const raw = await request.text()
  const signature = /^sha256=([a-f0-9]{64})$/.exec(request.headers.get('x-hub-signature-256') || '')?.[1]
  // During migration both app families can deliver to this endpoint. Verify
  // with configured secrets, then only dispatch accounts of the matching family.
  const modes = new Set()
  for (const [mode, name] of [['instagram_login', 'INSTAGRAM_APP_SECRET'], ['unified_login', 'META_APP_SECRET']]) {
    const secret = process.env[name]
    if (signature && secret && safeEqual(signature, hmac(secret, raw))) modes.add(mode)
  }
  if (!modes.size) throw new HttpError(401, 'bad signature')
  const payload = JSON.parse(raw)
  // Storage failures are collected, the rest of the batch is still handled,
  // and then the delivery is answered 500 so Meta retries it. Retrying is safe:
  // stored comments and messages are deduplicated by their platform id.
  const failures = []
  const record = (kind) => (error) => {
    console.error(`${kind} failed`, error.message)
    failures.push(kind)
  }
  if (payload.object == 'instagram') {
    for (const entry of payload.entry || []) {
      // Documented shape for messaging (Business Login for Instagram): entry[].messaging[].
      for (const event of entry.messaging || []) {
        await handleMessage(entry.id, event, modes).catch(record('message'))
      }
      // Comments arrive in changes[]; the Business Login examples also put
      // field/value straight on the entry, so accept both.
      const changes = entry.changes || (entry.field ? [{ field: entry.field, value: entry.value }] : [])
      for (const change of changes) {
        // Older/unified setups wrap messages as a change with field "messages".
        if (change.field == 'messages') {
          await handleMessage(entry.id, change.value, modes).catch(record('message'))
          continue
        }
        if (change.field != 'comments' && change.field != 'live_comments') continue
        await handleComment(entry.id, change.value, modes).catch(record('comment'))
      }
    }
  }
  if (failures.length) throw new HttpError(500, 'webhook storage failed')
  return json({ ok: true })
}
