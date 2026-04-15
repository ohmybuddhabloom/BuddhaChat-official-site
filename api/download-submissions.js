import {
  insertDownloadSubmission,
  normalizeEmail,
  upsertContact,
  hashIpAddress,
} from './_lib/supabase.js'
import { getOptionalEnv } from './_lib/env.js'
import { consumeRateLimit } from './_lib/rate-limit.js'
import {
  readJsonBody,
  sendError,
  sendJson,
  sendMethodNotAllowed,
} from './_lib/json.js'

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for']

  if (typeof forwardedFor !== 'string') {
    return ''
  }

  return forwardedFor.split(',')[0]?.trim() ?? ''
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
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
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const ctaVariant =
      typeof body.ctaVariant === 'string' ? body.ctaVariant.trim() : 'primary-download'
    const pagePath = typeof body.pagePath === 'string' ? body.pagePath : '/'

    if (!isValidEmail(email)) {
      sendError(res, 400, 'A valid email address is required.')
      return
    }

    const ipHash = hashIpAddress(getClientIp(req))
    const rateLimit = consumeRateLimit({
      key: `download:${ipHash ?? normalizeEmail(email)}`,
      limit: 5,
      windowMs: 10 * 60_000,
    })

    if (!rateLimit.ok) {
      sendError(res, 429, 'Too many download submissions. Please try again later.')
      return
    }

    const contact = await upsertContact(email)
    const userAgent = req.headers['user-agent']?.slice(0, 512) ?? null
    const submission = await insertDownloadSubmission({
      contact_id: contact.id,
      cta_variant: ctaVariant.slice(0, 128),
      page_path: pagePath.slice(0, 256),
      user_agent: userAgent,
    })

    sendJson(res, 200, {
      ok: true,
      contactId: contact.id,
      submissionId: submission?.id ?? null,
      downloadUrl: getOptionalEnv('APP_DOWNLOAD_URL'),
    })
  } catch (error) {
    if (isMissingConfigError(error)) {
      sendError(
        res,
        500,
        'Download submissions are not configured yet.',
        error.message,
      )
      return
    }

    sendError(
      res,
      500,
      'Unable to record the download submission right now.',
      error instanceof Error ? error.message : 'Unknown error',
    )
  }
}
