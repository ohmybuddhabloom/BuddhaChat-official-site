const SITE_SESSION_STORAGE_KEY = 'buddhachat-site-session-id'

export class SiteApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'SiteApiError'
    this.status = status
    this.details = details
  }
}

function createSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function getSiteSessionId() {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return createSessionId()
  }

  const existingSessionId = window.sessionStorage.getItem(SITE_SESSION_STORAGE_KEY)

  if (existingSessionId) {
    return existingSessionId
  }

  const nextSessionId = createSessionId()
  window.sessionStorage.setItem(SITE_SESSION_STORAGE_KEY, nextSessionId)
  return nextSessionId
}

export function getCurrentPagePath() {
  if (typeof window === 'undefined') {
    return '/'
  }

  const { pathname, search } = window.location
  return `${pathname}${search}`
}

async function postJson(path, payload) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok || !data?.ok) {
    throw new SiteApiError(
      data?.error ?? 'Request failed',
      response.status,
      data?.details,
    )
  }

  return data
}

export function submitChatPrompt({
  message,
  pagePath = getCurrentPagePath(),
  sessionId = getSiteSessionId(),
}) {
  return postJson('/api/chat-prompts', {
    message,
    pagePath,
    sessionId,
  })
}

export function submitDownloadLead({
  email,
  ctaVariant = 'primary-download',
  pagePath = getCurrentPagePath(),
}) {
  return postJson('/api/download-submissions', {
    email,
    ctaVariant,
    pagePath,
  })
}

export function createDonationIntent({
  email,
  selectedTierId,
  pagePath = getCurrentPagePath(),
}) {
  return postJson('/api/donation-intents', {
    email,
    selectedTierId,
    pagePath,
  })
}
