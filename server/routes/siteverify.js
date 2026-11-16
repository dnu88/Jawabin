import { HttpError } from '../http.js'

// Google Search Console proves ownership by fetching /google<token>.html and
// reading one line back. The token is only known after the owner adds the
// property, so answering the URL directly means nobody has to download, commit
// and redeploy a file just to prove they own the site.
const NAME = /^google[a-z0-9]{8,64}\.html$/i

export function siteVerification(file) {
  const name = String(file || '')
  if (!NAME.test(name)) throw new HttpError(404, 'not found')
  return new Response(`google-site-verification: ${name}`, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' },
  })
}
