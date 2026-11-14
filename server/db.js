import { createClient } from '@supabase/supabase-js'
import { HttpError, env } from './http.js'

let client

// Service-role client: bypasses row level security, so every query here must
// filter by the signed-in user's id itself.
export function db() {
  client ||= createClient(process.env.SUPABASE_URL || env('VITE_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}

export function check({ data, error, count }) {
  if (error) throw new HttpError(500, error.message)
  return count == null ? data : { data, count }
}

export async function requireUser(request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer /i, '')
  if (!token) throw new HttpError(401, 'sign in first')
  const { data, error } = await db().auth.getUser(token)
  if (error || !data?.user) throw new HttpError(401, 'session expired, sign in again')
  return data.user
}
