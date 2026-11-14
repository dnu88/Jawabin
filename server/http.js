export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })
}

export function redirect(url) {
  return new Response(null, { status: 302, headers: { location: url } })
}

export function env(name) {
  const value = process.env[name]
  if (!value) throw new HttpError(500, `server is missing ${name}`)
  return value
}

export function pageParams(url, defaultLimit = 20) {
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || defaultLimit))
  return { page, limit, from: (page - 1) * limit, to: page * limit - 1 }
}

export function paged(rows, count, { page, limit }, map = (row) => row) {
  return { docs: (rows || []).map(map), page, totalPages: Math.max(1, Math.ceil((count || 0) / limit)) }
}
