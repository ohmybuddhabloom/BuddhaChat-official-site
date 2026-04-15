import {
  hashIpAddress,
  insertChatPrompt,
} from './_lib/supabase.js'
import {
  consumeRateLimit,
} from './_lib/rate-limit.js'
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res)
    return
  }

  try {
    const body = await readJsonBody(req)
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const pagePath = typeof body.pagePath === 'string' ? body.pagePath : '/'
    const sessionId =
      typeof body.sessionId === 'string' && body.sessionId.trim()
        ? body.sessionId.trim()
        : null

    if (!message || message.length < 2 || message.length > 1200) {
      sendError(res, 400, 'Message must be between 2 and 1200 characters.')
      return
    }

    const userAgent = req.headers['user-agent']?.slice(0, 512) ?? null
    const ipHash = hashIpAddress(getClientIp(req))
    const rateLimitKey = `chat:${ipHash ?? sessionId ?? 'anonymous'}`
    const rateLimit = consumeRateLimit({
      key: rateLimitKey,
      limit: 10,
      windowMs: 60_000,
    })

    if (!rateLimit.ok) {
      sendError(res, 429, 'Too many chat submissions. Please slow down.')
      return
    }

    const row = await insertChatPrompt({
      message: message.slice(0, 1200),
      session_id: sessionId,
      page_path: pagePath.slice(0, 256),
      user_agent: userAgent,
      ip_hash: ipHash,
    })

    sendJson(res, 200, {
      ok: true,
      chatPromptId: row?.id ?? null,
    })
  } catch (error) {
    sendError(
      res,
      500,
      'Unable to record the chat prompt right now.',
      error instanceof Error ? error.message : 'Unknown error',
    )
  }
}
