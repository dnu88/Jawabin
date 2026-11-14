import { HttpError, json, pageParams, paged } from '../http.js'
import { db, check } from '../db.js'
import { sendMessage } from '../instagram.js'
import { MAX_TEXT_BYTES, textBytes, windowOpen } from '../chat.js'

const chatDoc = (row) => ({
  _id: row.id,
  accountId: row.account_id,
  participant: row.participant_username || row.platform_chat_id,
  lastMessageText: row.last_message_text,
  lastMessageAt: row.last_message_at,
  unread: row.unread || 0,
  canReply: windowOpen(row),
  account: row.accounts
    ? { username: row.accounts.username, picture: row.accounts.picture || '', platform: row.accounts.platform }
    : null,
})

const messageDoc = (row) => ({
  _id: row.id,
  chatId: row.chat_id,
  direction: row.direction,
  text: row.text,
  repliedBy: row.replied_by,
  error: row.error,
  createdAt: row.created_at,
})

async function ownChat(user, id) {
  const row = check(await db().from('chats').select('*, accounts(*)').eq('user_id', user.id).eq('id', id).maybeSingle())
  if (!row) throw new HttpError(404, 'conversation not found')
  return row
}

export async function listChats(user, _body, url) {
  const params = pageParams(url)
  const { data, count } = check(
    await db()
      .from('chats')
      .select('*, accounts(username, picture, platform)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false })
      .range(params.from, params.to),
  )
  return json(paged(data, count, params, chatDoc))
}

// The thread plus the conversation header. Reading it clears the unread badge.
export async function getChat(user, _body, _url, id) {
  const chat = await ownChat(user, id)
  const rows = check(
    await db().from('messages').select('*').eq('user_id', user.id).eq('chat_id', id).order('created_at', { ascending: false }).limit(100),
  )
  if (chat.unread) check(await db().from('chats').update({ unread: 0 }).eq('id', id))
  return json({ chat: chatDoc({ ...chat, unread: 0 }), messages: (rows || []).slice().reverse().map(messageDoc) })
}

// Manual reply. Meta rejects anything outside the 24-hour window, so refuse it
// here with a message the UI can show instead of a provider error.
export async function sendChatMessage(user, body, _url, id) {
  const text = String(body.text || '').trim()
  if (!text) throw new HttpError(400, 'message is required')
  if (textBytes(text) > MAX_TEXT_BYTES) throw new HttpError(400, 'message is too long (1000 bytes max)')
  const chat = await ownChat(user, id)
  if (!windowOpen(chat)) throw new HttpError(400, 'the 24-hour reply window has closed')
  await sendMessage(chat.accounts, chat.participant_id || chat.platform_chat_id, text)
  const row = check(
    await db().from('messages').insert({ user_id: user.id, chat_id: id, direction: 'out', text, replied_by: 'manual' }).select().single(),
  )
  check(await db().from('chats').update({ last_message_at: new Date().toISOString(), last_message_text: text, unread: 0 }).eq('id', id))
  return json(messageDoc(row))
}
