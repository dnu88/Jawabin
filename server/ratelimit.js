import { HttpError } from './http.js'
import { db } from './db.js'

// [max requests, window in seconds] per signed-in user. Routes not listed use `default`.
// Tighter limits sit on routes that call a paid AI provider, post to Instagram,
// or cannot be undone.
export const LIMITS = {
  default: [120, 60],
  'PUT ai': [10, 60],
  'GET instagram/authorize': [10, 60],
  'POST comments/:id/reply': [30, 60],
  'POST chats/:id/messages': [30, 60],
  'POST profile/delete': [5, 3600],
}
// Per IP address, for the one public route that does real work.
export const CALLBACK_LIMIT = [30, 60]

let warned = false

export function clientIp(request) {
  return (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
}

// Throws 429 when `key` has used up its allowance. If the limiter itself is
// unavailable (for example migration 0006 is not applied yet) requests are let
// through: a broken limiter must not take the whole API down.
export async function rateLimit(key, [max, windowSeconds]) {
  let allowed = true
  try {
    const { data, error } = await db().rpc('hit_rate_limit', { p_key: key, p_window_seconds: windowSeconds, p_limit: max })
    if (error) throw new Error(error.message)
    allowed = data !== false
  } catch (failure) {
    if (!warned) console.warn('rate limiter unavailable, requests are not limited:', failure.message)
    warned = true
    return
  }
  if (!allowed) throw new HttpError(429, 'too many requests, try again in a moment')
}
