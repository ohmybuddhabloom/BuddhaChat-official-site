// 1.4.5 任务8: what a visitor does on a share page, for the admin backend's share report.
// Nothing personal is kept: no user, IP or user agent, only the platform and whether it is WeChat.
import { insertShareEvent } from './_lib/supabase.js'
import { readJsonBody, sendMethodNotAllowed } from './_lib/json.js'
import { readSharePath, readShareParams } from '../src/lib/sharePage.js'

export const SHARE_EVENTS = new Set(['open', 'download', 'open_app', 'reshare', 'poster', 'read_more', 'video_guide'])
const BOT = /bot|crawl|spider|facebookexternalhit|whatsapp|telegrambot|line-poker|slackbot|twitterbot|preview/i

/** A clean row for public.share_events, or null when anything does not fit. */
export function shareEventRecord(body, userAgent = '') {
  if (!body || typeof body !== 'object' || BOT.test(userAgent)) return null
  const event = typeof body.event === 'string' ? body.event : ''
  if (!SHARE_EVENTS.has(event)) return null
  const share = readSharePath(`/s/${body.type}/${encodeURIComponent(String(body.id ?? ''))}`)
  if (!share) return null
  const search = new URLSearchParams()
  for (const key of ['r', 'ch', 'h', 'l']) if (body[key] !== undefined && body[key] !== null) search.set(key, String(body[key]))
  const params = readShareParams(`?${search}`)
  const platform = /iPhone|iPad|iPod/i.test(userAgent) ? 'ios' : /Android/i.test(userAgent) ? 'android' : 'other'
  return {
    event,
    content_type: share.type,
    content_id: share.id,
    share_id: params.r ?? null,
    channel: params.ch ?? null,
    hop: params.h ?? null,
    locale: params.l ?? null,
    platform,
    in_wechat: /MicroMessenger/i.test(userAgent),
    in_app: body.inApp === true,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res, ['POST'])
    return
  }
  try {
    // sendBeacon posts text/plain, which Vercel hands over as a string.
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : await readJsonBody(req)
    const record = shareEventRecord(body, String(req.headers?.['user-agent'] ?? ''))
    if (record) await insertShareEvent(record)
  } catch {
    // A report never breaks the page; a missing table (production before migration) is ignored too.
  }
  res.statusCode = 204
  res.setHeader('cache-control', 'no-store')
  res.end()
}
