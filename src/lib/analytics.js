const visitorStorageKey = 'buddhachat-official:analytics-visitor-id:v1'
const sessionStorageKey = 'buddhachat-official:analytics-session-id:v1'
const channelStorageKey = 'buddhachat-official:analytics-channel-code:v1'

function createId(prefix) {
  const random =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `${prefix}_${random}`
}

function readOrCreateStorageId(storage, key, prefix) {
  if (!storage) {
    return createId(prefix)
  }

  try {
    const existing = storage.getItem(key)
    if (existing) {
      return existing
    }

    const next = createId(prefix)
    storage.setItem(key, next)
    return next
  } catch {
    return createId(prefix)
  }
}

function sanitizeChannelCode(code) {
  const cleaned = String(code ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)

  return cleaned || null
}

function getChannelCode() {
  try {
    const urlCode = sanitizeChannelCode(
      new URLSearchParams(window.location.search).get('ch'),
    )

    if (urlCode) {
      window.localStorage?.setItem(channelStorageKey, urlCode)
      return urlCode
    }

    return sanitizeChannelCode(window.localStorage?.getItem(channelStorageKey))
  } catch {
    return null
  }
}

function cleanMetadata(metadata = {}) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  )
}

function currentPath() {
  const { pathname, search } = window.location
  const params = new URLSearchParams()
  const story = new URLSearchParams(search).get('story')

  if (story) {
    params.set('story', story.replace(/[^a-zA-Z0-9_-]+/g, '').slice(0, 80))
  }

  const safeSearch = params.toString()
  return `${pathname}${safeSearch ? `?${safeSearch}` : ''}`
}

function cleanReferrer() {
  if (!document.referrer) return null

  try {
    const url = new URL(document.referrer)
    return `${url.origin}${url.pathname}`
  } catch {
    return null
  }
}

export function targetProductFromHref(href) {
  try {
    const url = new URL(href, window.location.origin)
    const firstSegment = url.pathname.split('/').filter(Boolean)[0]
    return firstSegment || 'official'
  } catch {
    return 'official'
  }
}

export function trackOfficialEvent(eventName, metadata = {}) {
  if (typeof window === 'undefined' || typeof fetch !== 'function') {
    return
  }

  void fetch('/api/analytics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      eventName,
      visitorId: readOrCreateStorageId(
        window.localStorage,
        visitorStorageKey,
        'visitor',
      ),
      sessionId: readOrCreateStorageId(
        window.sessionStorage,
        sessionStorageKey,
        'session',
      ),
      channelCode: getChannelCode(),
      path: currentPath(),
      referrer: cleanReferrer(),
      userAgent: navigator.userAgent || null,
      metadata: cleanMetadata(metadata),
    }),
    keepalive: true,
  }).catch(() => undefined)
}

export function trackPageView(metadata) {
  trackOfficialEvent('page_view', metadata)
}

export function trackNavClick(href, placement = 'primary_nav') {
  trackOfficialEvent('nav_click', {
    placement,
    targetProduct: targetProductFromHref(href),
  })
}

export function trackCtaClick(placement, targetProduct = 'official') {
  trackOfficialEvent('cta_click', {
    placement,
    targetProduct,
  })
}
