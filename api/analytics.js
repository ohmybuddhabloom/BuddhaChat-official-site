import { insertAnalyticsEvent } from './_lib/supabase.js'
import {
  readJsonBody,
  sendError,
  sendJson,
  sendMethodNotAllowed,
} from './_lib/json.js'

const ALLOWED_EVENTS = new Set(['page_view', 'nav_click', 'cta_click'])
const METADATA_STRING_KEYS = new Set([
  'targetProduct',
  'placement',
  'contentId',
  'contentSlug',
  'scene',
  'playbackSource',
])
const METADATA_NUMBER_KEYS = new Set(['queryLength', 'resultCount'])

function cleanString(value, maxLength) {
  if (typeof value !== 'string') {
    return null
  }

  const cleaned = value.trim().slice(0, maxLength)
  return cleaned || null
}

function cleanId(value) {
  return cleanString(value, 120)?.replace(/[^a-zA-Z0-9_.:-]+/g, '_') ?? null
}

function cleanEventName(value) {
  const eventName =
    cleanString(value, 80)
      ?.toLowerCase()
      .replace(/[^a-z0-9_.:-]+/g, '_')
      .replace(/^_+|_+$/g, '') ?? null

  return eventName && ALLOWED_EVENTS.has(eventName) ? eventName : null
}

function cleanChannelCode(value) {
  return (
    cleanString(value, 64)
      ?.toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') ?? null
  )
}

function cleanPath(value) {
  const rawPath = cleanString(value, 512) ?? '/'

  try {
    const url = new URL(rawPath, 'https://www.buddhachat.online')
    const params = new URLSearchParams()
    const story = cleanString(url.searchParams.get('story'), 80)?.replace(
      /[^a-zA-Z0-9_-]+/g,
      '',
    )

    if (story) {
      params.set('story', story)
    }

    const search = params.toString()
    return `${url.pathname || '/'}${search ? `?${search}` : ''}`.slice(0, 512)
  } catch {
    return '/'
  }
}

function cleanReferrer(value) {
  const referrer = cleanString(value, 512)

  if (!referrer) {
    return null
  }

  try {
    const url = new URL(referrer)
    return `${url.origin}${url.pathname}`.slice(0, 512)
  } catch {
    return null
  }
}

function cleanMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const metadata = {}

  for (const [key, entryValue] of Object.entries(value)) {
    if (METADATA_STRING_KEYS.has(key)) {
      const cleaned = cleanString(entryValue, 120)
      if (cleaned) {
        metadata[key] = cleaned
      }
    }

    if (METADATA_NUMBER_KEYS.has(key) && Number.isFinite(entryValue)) {
      metadata[key] = Math.max(0, Math.min(100000, Math.trunc(entryValue)))
    }
  }

  return metadata
}

function isMissingConfigError(error) {
  return (
    error instanceof Error &&
    error.message.startsWith('Missing required environment variable:')
  )
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res)
    return
  }

  try {
    const body = await readJsonBody(req)
    const eventName = cleanEventName(body.eventName)
    const visitorId = cleanId(body.visitorId)

    if (!eventName || !visitorId) {
      sendError(res, 400, 'A valid analytics event and visitor are required.')
      return
    }

    await insertAnalyticsEvent({
      product: 'official',
      event_name: eventName,
      visitor_id: visitorId,
      session_id: cleanId(body.sessionId),
      channel_code: cleanChannelCode(body.channelCode),
      path: cleanPath(body.path),
      referrer: cleanReferrer(body.referrer),
      user_agent: cleanString(body.userAgent, 512),
      metadata: cleanMetadata(body.metadata),
    })

    sendJson(res, 200, { ok: true })
  } catch (error) {
    if (isMissingConfigError(error)) {
      sendError(res, 500, 'Analytics are not configured yet.')
      return
    }

    sendError(
      res,
      500,
      'Unable to record the analytics event right now.',
    )
  }
}
