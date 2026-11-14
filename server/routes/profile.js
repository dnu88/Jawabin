import { json } from '../http.js'
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
