const CANONICAL_ORIGIN = 'https://www.buddhachat.online'
const ZENTUBE_LOGIN_URL = `${CANONICAL_ORIGIN}/videos/auth/login`
const ALLOWED_RETURN_ORIGINS = new Set([
  CANONICAL_ORIGIN,
  'https://buddhachat.online',
  'https://sutra.buddhachat.online',
  'https://music.buddhachat.online',
])

function getRequestOrigin(req) {
  const hostHeader = req.headers['x-forwarded-host'] ?? req.headers.host
  const protoHeader = req.headers['x-forwarded-proto'] ?? 'https'
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader
  const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader

  if (!host) {
    return 'https://www.buddhachat.online'
  }

  return `${proto || 'https'}://${host}`
}

function resolveSafeReturnUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return `${CANONICAL_ORIGIN}/`
  }

  const candidate = value.trim()

  if (candidate.startsWith('/') && !candidate.startsWith('//')) {
    return new URL(candidate, CANONICAL_ORIGIN).toString()
  }

  try {
    const parsed = new URL(candidate)
    if (ALLOWED_RETURN_ORIGINS.has(parsed.origin)) {
      return parsed.toString()
    }
  } catch {
    return `${CANONICAL_ORIGIN}/`
  }

  return `${CANONICAL_ORIGIN}/`
}

export default function handler(req, res) {
  const requestOrigin = getRequestOrigin(req)
  const requestUrl = new URL(req.url ?? '/', requestOrigin)
  const returnUrl = resolveSafeReturnUrl(
    requestUrl.searchParams.get('returnUrl'),
  )
  const loginUrl = new URL(ZENTUBE_LOGIN_URL)
  loginUrl.searchParams.set('returnUrl', returnUrl)

  res.statusCode = 307
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Location', loginUrl.toString())
  res.end('Redirecting to Zentube login.')
}
