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

async function handleComment(igUserId, value) {
  if (!value?.id || !value.text) return
  const account = check(await db().from('accounts').select('*').eq('platform', 'instagram').eq('platform_user_id', String(igUserId)).maybeSingle())
  // Skip unknown accounts and the account's own comments (including our replies).
  if (!account || String(value.from?.id) == account.platform_user_id) return
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
  await autoReply(account, comment)
}

async function handleMessage(igUserId, value) {
  if (!value?.message?.mid) return
  const account = check(
    await db().from('accounts').select('*').eq('platform', 'instagram').eq('platform_user_id', String(igUserId)).maybeSingle(),
  )
  if (!account) return
  await receiveMessage(account, value)
}

export async function receiveWebhook(request) {
  const raw = await request.text()
  const signature = (request.headers.get('x-hub-signature-256') || '').replace('sha256=', '')
  if (!signature || !safeEqual(signature, hmac(env('INSTAGRAM_APP_SECRET'), raw))) throw new HttpError(401, 'bad signature')
  const payload = JSON.parse(raw)
  if (payload.object == 'instagram') {
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field == 'messages') {
          await handleMessage(entry.id, change.value).catch((error) => console.error('message failed', error.message))
          continue
        }
        if (change.field != 'comments') continue
        await handleComment(entry.id, change.value).catch((error) => console.error('comment failed', error.message))
      }
    }
  }
  return json({ ok: true })
}
