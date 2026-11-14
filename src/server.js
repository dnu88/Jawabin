import { session } from './auth'

// Calls the Vercel functions under /api as the signed-in user.
export async function request(method, path, body) {
  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      authorization: `Bearer ${session.value?.access_token || ''}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `request failed (${response.status})`)
  return data
}
