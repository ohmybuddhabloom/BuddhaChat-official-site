export const DEFAULT_ZENTUBE_ORIGIN = 'https://zentube.buddhachat.online'

export function getZentubeOrigin() {
  return import.meta.env.VITE_ZENTUBE_ORIGIN || DEFAULT_ZENTUBE_ORIGIN
}

export async function fetchZentubeSession({
  fetchImpl = globalThis.fetch,
  origin = getZentubeOrigin(),
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
    const response = await fetchImpl(`${origin.replace(/\/+$/, '')}/api/auth/user`, {
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
