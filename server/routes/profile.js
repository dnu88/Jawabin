import { HttpError, json } from '../http.js'
import { db, check } from '../db.js'

const KEYS = ['affiliate', 'expired', 'transaction', 'account']

export async function getProfile(user) {
  const row = check(await db().from('profiles').select('notification').eq('id', user.id).maybeSingle())
  return json({ notification: row?.notification || {} })
}

export async function putNotification(user, body) {
  const notification = Object.fromEntries(KEYS.map((key) => [key, !!body[key]]))
  check(await db().from('profiles').update({ notification }).eq('id', user.id))
  return json({ notification })
}

// Deletes the signed-in user for good. Every table references auth.users with
// ON DELETE CASCADE, so profile, connected accounts and their encrypted tokens,
// comments, messages, rules, AI settings, usage and activity rows go with it.
// The caller must repeat their own email, so a stray request cannot do this.
export async function deleteProfile(user, body) {
  const typed = String(body.confirm || '').trim().toLowerCase()
  if (!typed || typed != String(user.email || '').toLowerCase()) throw new HttpError(400, 'type your account email to confirm')
  const { error } = await db().auth.admin.deleteUser(user.id)
  if (error) throw new HttpError(500, error.message)
  return json({ ok: true })
}
