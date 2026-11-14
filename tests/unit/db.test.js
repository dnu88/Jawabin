import { beforeEach, describe, expect, it, vi } from 'vitest'

// The Supabase client is the only thing worth faking here: everything else in
// db.js (error translation, the auth check) is what we want to exercise.
const getUser = vi.hoisted(() => vi.fn())

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser } }),
}))

const { check, requireUser } = await import('../../server/db.js')
const { HttpError } = await import('../../server/http.js')

const request = (headers = {}) => new Request('https://jawabin.test/api/ai', { headers })

beforeEach(() => {
  getUser.mockReset()
})

describe('requireUser', () => {
  it('rejects a request without a bearer token before touching Supabase', async () => {
    await expect(requireUser(request())).rejects.toThrowError(/sign in first/)
    expect(getUser).not.toHaveBeenCalled()
  })

  it('rejects an expired or invalid session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } })
    await expect(requireUser(request({ authorization: 'Bearer nope' }))).rejects.toThrowError(/session expired/)
  })

  it('returns the user for a valid token, in a case-insensitive scheme', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    await expect(requireUser(request({ authorization: 'bearer good' }))).resolves.toEqual({ id: 'user-1' })
    expect(getUser).toHaveBeenCalledWith('good')
  })
})

describe('check', () => {
  it('returns data when no count was requested', () => {
    expect(check({ data: [{ id: 1 }], error: null })).toEqual([{ id: 1 }])
  })

  it('returns data and count together for paginated queries', () => {
    expect(check({ data: [], count: 7, error: null })).toEqual({ data: [], count: 7 })
  })

  it('turns a Supabase error into a 500 HttpError', () => {
    try {
      check({ data: null, error: { message: 'relation does not exist' } })
      throw new Error('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError)
      expect(error.status).toBe(500)
      expect(error.message).toBe('relation does not exist')
    }
  })
})
