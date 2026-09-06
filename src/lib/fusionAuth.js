export const DEFAULT_ZENTUBE_ORIGIN = 'https://www.buddhachat.online/videos'

export function getZentubeOrigin() {
  return import.meta.env.VITE_ZENTUBE_ORIGIN || DEFAULT_ZENTUBE_ORIGIN
}

export function getZentubeApiOrigin() {
  return import.meta.env.VITE_ZENTUBE_API_ORIGIN || ''
}

function buildApiUrl(path, origin = getZentubeApiOrigin()) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const normalizedOrigin = origin.replace(/\/+$/, '')

  return normalizedOrigin ? `${normalizedOrigin}${normalizedPath}` : normalizedPath
}

async function fetchWithTimeout(fetchImpl, url, options) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function requestZentubeApi(path, { fetchImpl = globalThis.fetch, body, method = 'GET' } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch-unavailable')
  }

  const response = await fetchWithTimeout(fetchImpl, buildApiUrl(path), {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok || payload?.success === false) {
    const error = new Error(payload?.message || `http-${response.status}`)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}

export async function fetchZentubeSession({
  fetchImpl = globalThis.fetch,
  origin = getZentubeApiOrigin(),
} = {}) {
  if (typeof fetchImpl !== 'function') {
    return {
      status: 'unavailable',
      authenticated: false,
      reason: 'fetch-unavailable',
      user: null,
    }
  }

  try {
    const response = await fetchWithTimeout(fetchImpl, buildApiUrl('/api/auth/user', origin), {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      return {
        status: 'unavailable',
        authenticated: false,
        reason: `http-${response.status}`,
        user: null,
      }
    }

    const payload = await response.json()
    const user = payload?.user ?? null

    return {
      status: user ? 'authenticated' : 'anonymous',
      authenticated: Boolean(user),
      reason: payload?.message ?? '',
      user,
    }
  } catch (error) {
    return {
      status: 'unavailable',
      authenticated: false,
      reason: error instanceof Error ? error.message : 'request-failed',
      user: null,
    }
  }
}

export function sendLoginCode(email, { fetchImpl } = {}) {
  return requestZentubeApi('/api/auth/send-login-code', {
    fetchImpl,
    method: 'POST',
    body: { email },
  })
}

export function requestAccountCode(email, { fetchImpl } = {}) {
  return requestZentubeApi('/api/auth/otp/send', { fetchImpl, method: 'POST', body: { email } })
}

export function verifyAccountCode({ email, token }, { fetchImpl } = {}) {
  return requestZentubeApi('/api/auth/otp/verify', { fetchImpl, method: 'POST', body: { email, token } })
}

export function loginWithCode({ email, code }, { fetchImpl } = {}) {
  return requestZentubeApi('/api/auth/login-with-code', {
    fetchImpl,
    method: 'POST',
    body: { email, code },
  })
}

export function logoutZentube({ fetchImpl } = {}) {
  return requestZentubeApi('/api/auth/logout', {
    fetchImpl,
    method: 'POST',
  })
}

export function buildAuthReturnUrl(pathname, origin = window.location.origin) {
  const fallback = new URL('/', origin).toString()

  if (!pathname || typeof pathname !== 'string') {
    return fallback
  }

  try {
    const parsed = new URL(pathname, origin)
    if (parsed.origin === origin && !parsed.username && !parsed.password) {
      return parsed.toString()
    }
  } catch {
    return fallback
  }

  return fallback
}
