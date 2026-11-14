import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { HttpError, env } from './http.js'

function key() {
  const value = Buffer.from(env('ENCRYPTION_KEY'), 'hex')
  if (value.length != 32) throw new HttpError(500, 'ENCRYPTION_KEY must be 64 hex characters')
  return value
}

// AES-256-GCM; stored as iv.tag.ciphertext in base64url.
export function encrypt(text) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const body = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), body].map((part) => part.toString('base64url')).join('.')
}

export function decrypt(value) {
  const [iv, tag, body] = String(value).split('.').map((part) => Buffer.from(part, 'base64url'))
  const decipher = createDecipheriv('aes-256-gcm', key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8')
}

export function hmac(secret, text) {
  return createHmac('sha256', secret).update(text).digest('hex')
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  return left.length == right.length && timingSafeEqual(left, right)
}

// Short-lived signed value carried through the OAuth redirect.
export function signState(payload, minutes = 15) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + minutes * 60000 })).toString('base64url')
  return `${body}.${hmac(key(), body)}`
}

export function readState(state) {
  const [body, signature] = String(state || '').split('.')
  if (!body || !signature || !safeEqual(signature, hmac(key(), body))) throw new HttpError(400, 'invalid state')
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  if (payload.exp < Date.now()) throw new HttpError(400, 'state expired, try again')
  return payload
}
