export const DEFAULT_ZENTUBE_ORIGIN = 'https://zentube.buddhachat.online'

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

async function requestZentubeApi(path, { fetchImpl = globalThis.fetch, body, method = 'GET' } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch-unavailable')
  }

  const response = await fetchImpl(buildApiUrl(path), {
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
    const response = await fetchImpl(buildApiUrl('/api/auth/user', origin), {
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

  if (pathname.startsWith('/') && !pathname.startsWith('//')) {
    return new URL(pathname, origin).toString()
  }

  try {
    const parsed = new URL(pathname)
    if (parsed.origin === origin) {
      return parsed.toString()
    }
  } catch {
    return fallback
  }

  return fallback
}
