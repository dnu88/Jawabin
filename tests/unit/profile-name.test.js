import { beforeEach, expect, it, vi } from 'vitest'

const { client, query } = vi.hoisted(() => {
  const query = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn() }
  return { query, client: { from: vi.fn(() => query), auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: vi.fn() } } }
})
vi.mock('../../src/supabase', () => ({ supabase: client }))
const { updateProfileName, user } = await import('../../src/api')
const { session, authReady } = await import('../../src/auth')
await authReady

beforeEach(() => {
  vi.clearAllMocks()
  session.value = { user: { id: 'owner' } }
  user.name = 'Original'
})

it('updates only the current profile name and displays the returned row', async () => {
  query.single.mockResolvedValue({ data: { name: 'Stored' }, error: null })
  await updateProfileName('  New name  ')
  expect(client.from).toHaveBeenCalledWith('profiles')
  expect(query.update).toHaveBeenCalledWith({ name: 'New name' })
  expect(query.eq).toHaveBeenCalledWith('id', 'owner')
  expect(query.select).toHaveBeenCalledWith('name')
  expect(user.name).toBe('Stored')
})

it.each(['   ', 'x'.repeat(81)])('rejects invalid names before writing', async name => {
  await expect(updateProfileName(name)).rejects.toThrow()
  expect(client.from).not.toHaveBeenCalled()
})

it('does not show success on a denied or missing row', async () => {
  query.single.mockResolvedValue({ data: null, error: new Error('update denied') })
  await expect(updateProfileName('New')).rejects.toThrow('update denied')
  expect(user.name).toBe('Original')
})

it('does not fall back to a demo write without a session', async () => {
  session.value = null
  await expect(updateProfileName('New')).rejects.toThrow()
  expect(client.from).not.toHaveBeenCalled()
  expect(user.name).toBe('Original')
})
