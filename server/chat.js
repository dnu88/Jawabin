import { HttpError } from './http.js'
import { db, check } from './db.js'
import { generate, loadSettings, logUsage } from './ai.js'
import { matchRule } from './autoreply.js'
import { sendMessage } from './instagram.js'

export const WINDOW_MS = 24 * 60 * 60 * 1000

const SYSTEM = [
  'You answer direct messages sent to a business account on Instagram.',
  'Write one short, friendly reply in the same language as the message.',
  'Follow the owner instructions. Never invent prices, stock or policies that the instructions do not give.',
  'Return only the reply text.',
].join(' ')

// Meta closes the reply window 24 hours after the person's last message, so a
// manual or automatic answer outside it would be rejected by the API anyway.
export function windowOpen(chat, now = Date.now()) {
  if (!chat?.last_inbound_at) return false
  return now - new Date(chat.last_inbound_at).getTime() < WINDOW_MS
}

async function insertMessage(row) {
  const { data, error } = await db().from('messages').insert(row).select().single()
  if (error) {
    // Instagram retries deliveries; the same message id may arrive twice.
    if (error.code == '23505') return null
    throw new HttpError(500, error.message)
  }
  return data
}

async function bumpChat(chatId, values) {
  check(await db().from('chats').update(values).eq('id', chatId))
}

// Stores an inbound DM and lets the chat rules answer it. The returned object is
// only used by tests: the webhook answers 200 either way.
export async function receiveMessage(account, value) {
  const sender = String(value?.sender?.id || '')
  const mid = String(value?.message?.mid || '')
  const text = String(value?.message?.text || '').trim()
  // Instagram also delivers our own outgoing messages back as an event.
  if (!sender || !mid || sender == String(account.platform_user_id)) return { ignored: true }
  const at = value.timestamp ? new Date(Number(value.timestamp)).toISOString() : new Date().toISOString()

  const chat = check(
    await db()
      .from('chats')
      .upsert(
        {
          user_id: account.user_id,
          account_id: account.id,
          platform: 'instagram',
          platform_chat_id: sender,
          participant_id: sender,
          last_inbound_at: at,
          last_message_at: at,
          last_message_text: text,
        },
        { onConflict: 'account_id,platform_chat_id' },
      )
      .select()
      .single(),
  )

  const stored = await insertMessage({
    user_id: account.user_id,
    chat_id: chat.id,
    direction: 'in',
    text,
    platform_message_id: mid,
  })
  if (!stored) return { chat, duplicate: true }
  // Read-modify-write on purpose: one writer per chat in practice, and a counter
  // is enough for the badge. A wrong count is cosmetic, a lost message is not.
  await bumpChat(chat.id, { unread: (chat.unread || 0) + 1 })

  return { chat, replied: await autoReplyChat(account, chat, { text, mid }) }
}

async function autoReplyChat(account, chat, message) {
  const rules = check(await db().from('rules').select('*').eq('user_id', account.user_id).order('created_at'))
  const rule = matchRule(rules, { text: message.text, account_id: account.id }, 'chat')
  if (!rule) return false
  let reply = rule.reply
  let repliedBy = rule.type == 'ai' ? 'ai' : 'rule'
  try {
    if (rule.type == 'ai') {
      const settings = await loadSettings(account.user_id)
      if (!settings) throw new Error('AI is not set up yet')
      const result = await generate(settings, { system: `${SYSTEM}\n\nOwner instructions:\n${rule.prompt}`, user: message.text })
      await logUsage(account.user_id, 'chat', result)
      reply = result.text
    }
    if (!reply) throw new Error('reply is empty')
    await sendMessage(account, chat.participant_id, reply)
    await insertMessage({ user_id: account.user_id, chat_id: chat.id, direction: 'out', text: reply, replied_by: repliedBy })
    await bumpChat(chat.id, { last_message_at: new Date().toISOString(), last_message_text: reply })
    return true
  } catch (error) {
    // Keep the failure visible in the thread instead of only in the logs.
    const reason = String(error.message || error).slice(0, 500)
    await insertMessage({ user_id: account.user_id, chat_id: chat.id, direction: 'out', text: reply, replied_by: repliedBy, error: reason })
    return false
  }
}
