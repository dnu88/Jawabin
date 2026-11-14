import { describe, expect, it } from 'vitest'
import { HttpError, env, json, paged, pageParams, redirect } from '../../server/http.js'

const url = (qs) => new URL(`https://jawabin.test/api/comments${qs}`)

describe('pageParams', () => {
  it('defaults to page 1 and 20 rows', () => {
    expect(pageParams(url(''))).toEqual({ page: 1, limit: 20, from: 0, to: 19 })
  })

  it('translates page and limit into a range', () => {
    expect(pageParams(url('?page=3&limit=10'))).toEqual({ page: 3, limit: 10, from: 20, to: 29 })
  })

  it('clamps garbage, negatives and oversized limits', () => {
    expect(pageParams(url('?page=0&limit=0')).page).toBe(1)
    expect(pageParams(url('?page=-5&limit=9999'))).toEqual({ page: 1, limit: 100, from: 0, to: 99 })
    expect(pageParams(url('?page=abc&limit=xyz'))).toEqual({ page: 1, limit: 20, from: 0, to: 19 })
  })
})

describe('paged', () => {
  const params = { page: 2, limit: 20 }

  it('maps rows and derives totalPages', () => {
    expect(paged([{ id: 1 }], 61, params, (row) => ({ _id: row.id }))).toEqual({
      docs: [{ _id: 1 }],
      page: 2,
      totalPages: 4,
    })
  })

  it('never reports zero pages and tolerates empty rows', () => {
    expect(paged([], 0, params)).toEqual({ docs: [], page: 2, totalPages: 1 })
    expect(paged(null, 0, params).docs).toEqual([])
  })
})

describe('json / redirect / env', () => {
  it('json() builds a JSON Response with the right status', async () => {
    const response = json({ ok: true }, 201)
    expect(response.status).toBe(201)
    expect(response.headers.get('content-type')).toBe('application/json')
    expect(await response.json()).toEqual({ ok: true })
  })

  it('redirect() points the browser at the target', () => {
    const response = redirect('/user/account?connected=ig')
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/user/account?connected=ig')
  })

  it('env() throws a 500 HttpError naming the missing variable', () => {
    delete process.env.JAWABIN_MISSING_VAR
    expect(() => env('JAWABIN_MISSING_VAR')).toThrowError(HttpError)
    try {
      env('JAWABIN_MISSING_VAR')
    } catch (error) {
      expect(error.status).toBe(500)
      expect(error.message).toContain('JAWABIN_MISSING_VAR')
    }
  })

  it('HttpError carries the status it was built with', () => {
    expect(new HttpError(404, 'not found').status).toBe(404)
  })
})
