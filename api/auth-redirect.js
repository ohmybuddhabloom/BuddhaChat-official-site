import { getPublicOrigin, safeReturnUrl } from './_lib/public-origin.js'

export default function handler(req, res, { env = process.env } = {}) {
  const requestOrigin = getPublicOrigin(req, env)
  const requestUrl = new URL(req.url ?? '/', requestOrigin)
  const returnUrl = safeReturnUrl(requestUrl.searchParams.get('returnUrl'), requestOrigin)
  const loginUrl = new URL('/login', requestOrigin)
  loginUrl.searchParams.set('returnUrl', returnUrl)

  res.statusCode = 307
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Location', loginUrl.toString())
  res.end('Redirecting to sign in.')
}
