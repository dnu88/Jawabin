import { ref } from 'vue'
import { supabase } from './supabase'
import { user } from './api'

export const authEnabled = !!supabase
export const session = ref(null)

async function applySession(next) {
  session.value = next
  if (!next) return
  const account = next.user
  user.email = account.email || ''
  user.name = account.user_metadata?.name || account.user_metadata?.full_name || user.email.split('@')[0]
  const { data } = await supabase.from('profiles').select('name, phone, plan, expired_at').eq('id', account.id).maybeSingle()
  if (data) {
    user.name = data.name || user.name
    user.phone = data.phone
    user.plan = data.plan
    user.expiredAt = data.expired_at
  }
}

// Resolves once the stored session (if any) has been restored.
export const authReady = authEnabled
  ? supabase.auth.getSession().then(({ data }) => applySession(data.session))
  : Promise.resolve()

if (authEnabled) {
  supabase.auth.onAuthStateChange((_event, next) => {
    // Defer: Supabase forbids awaiting its own client inside this callback.
    setTimeout(() => applySession(next), 0)
  })
}

function unwrap({ data, error }) {
  if (error) throw error
  return data
}

export async function signIn(email, password) {
  await applySession(unwrap(await supabase.auth.signInWithPassword({ email, password })).session)
}

// Returns false when the project requires email confirmation before signing in.
export async function signUp(name, email, password) {
  const data = unwrap(await supabase.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: window.location.origin } }))
  await applySession(data.session)
  return !!data.session
}

export async function signInWithGoogle() {
  unwrap(await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } }))
}

export async function signOut() {
  unwrap(await supabase.auth.signOut())
  session.value = null
}

export async function saveAuthenticatedName(name) {
  const id = session.value?.user.id
  if (!id) throw new Error('No active session')
  const row = unwrap(await supabase.from('profiles').update({ name }).eq('id', id).select('name').single())
  if (session.value?.user.id !== id) throw new Error('Session changed')
  user.name = row.name
}

export async function updatePassword(password) {
  unwrap(await supabase.auth.updateUser({ password }))
}

// After the server deleted the account: drop the local session without calling Supabase again.
export async function forgetSession() {
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
  session.value = null
}
