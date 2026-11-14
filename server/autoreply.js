import { db, check } from './db.js'
import { generate, loadSettings, logUsage } from './ai.js'
import { replyToComment } from './instagram.js'

const SYSTEM = [
  'You reply to comments on a business social media account.',
  'Write one short, friendly reply in the same language as the comment.',
  'Follow the owner instructions. Never invent prices, stock or policies that the instructions do not give.',
  'Return only the reply text.',
].join(' ')

// Keyword rules win over AI rules; an AI rule answers whatever is left.
// `channel` keeps comment rules away from DMs and the other way round; a rule
// without a channel came from before the chats migration, so it means comments.
export function matchRule(rules, comment, channel = 'comment') {
  const text = String(comment.text || '').toLowerCase()
  const usable = rules.filter(
    (rule) =>
      rule.is_active &&
      (!rule.account_id || rule.account_id == comment.account_id) &&
      ((rule.channel || 'comment') == channel || rule.channel == 'both'),
  )
  const hit = usable.find((rule) => rule.type == 'keyword' && (rule.keywords || []).some((word) => word.trim() && text.includes(word.trim().toLowerCase())))
  return hit || usable.find((rule) => rule.type == 'ai')
}

// Applies the first matching rule to a stored comment and records the outcome.
export async function autoReply(account, comment) {
  const rules = check(await db().from('rules').select('*').eq('user_id', account.user_id).order('created_at'))
  const rule = matchRule(rules, comment)
  if (!rule) return
  const update = {}
  try {
    let message = rule.reply
    if (rule.type == 'ai') {
      const settings = await loadSettings(account.user_id)
      if (!settings) throw new Error('AI is not set up yet')
      const result = await generate(settings, { system: `${SYSTEM}\n\nOwner instructions:\n${rule.prompt}`, user: comment.text })
      await logUsage(account.user_id, 'content', result)
      message = result.text
    }
    if (!message) throw new Error('reply is empty')
    await replyToComment(account, comment.platform_comment_id, message)
    Object.assign(update, { status: 'resolved', reply_text: message, replied_by: rule.type == 'ai' ? 'ai' : 'rule', error: '' })
  } catch (error) {
    update.error = String(error.message || error).slice(0, 500)
  }
  check(await db().from('comments').update(update).eq('id', comment.id))
}
