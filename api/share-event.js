// 1.4.5 任务8: what a visitor does on a share page, for the admin backend's share report.
// Nothing personal is kept: no user, IP or user agent, only the platform and whether it is WeChat.
// The sharer's invite code on a first open only pays that sharer's merit; it is not stored here.
import { awardShareOpen, insertShareEvent } from './_lib/supabase.js'
import { readJsonBody, sendMethodNotAllowed } from './_lib/json.js'
import { readSharePath, readShareParams } from '../src/lib/sharePage.js'

export const SHARE_EVENTS = new Set(['open', 'download', 'open_app', 'reshare', 'poster', 'read_more', 'video_guide'])
// Only the channels the App and the pages themselves write, and only the App's share id shape, so
// no free text (a name, a phone number) can ever be stored through these fields.
export const SHARE_CHANNELS = new Set(['app', 'system', 'copy', 'wechat', 'whatsapp', 'facebook', 'line', 'telegram', 'x', 'poster', 'web'])
const SHARE_ID = /^[0-9a-z]{12}$/
// The main site and the backup share domain (Owner 2026-11-28).
const SITE_ORIGINS = /^https:\/\/(?:(?:www|staging)\.buddhachat\.online|(?:www\.|staging\.)?buddhachat\.net)(?:\/|$)/

// Per instance, at most 30 events a minute from one address; the address is never stored.
const WINDOW_MS = 60_000
const LIMIT = 30
const recent = new Map()

export function allowShareEvent(address, now = Date.now()) {
  if (recent.size > 5000) {
    for (const [key, entry] of recent) if (now - entry.start > WINDOW_MS) recent.delete(key)
  }
  const key = String(address || 'unknown')
  const entry = recent.get(key)
  if (!entry || now - entry.start > WINDOW_MS) {
    recent.set(key, { start: now, count: 1 })
    return true
  }
  entry.count += 1
  return entry.count <= LIMIT
}

/** Only our own share pages report: a request from elsewhere, or without a browser, is dropped. */
export function fromSharePage(headers = {}) {
  const origin = String(headers.origin || headers.referer || '')
  return SITE_ORIGINS.test(origin) && Boolean(String(headers['user-agent'] || '').trim())
}
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
    share_id: params.r && SHARE_ID.test(params.r) ? params.r : null,
    channel: params.ch && SHARE_CHANNELS.has(params.ch) ? params.ch : null,
    hop: params.h ?? null,
    locale: params.l ?? null,
    platform,
    in_wechat: /MicroMessenger/i.test(userAgent),
    in_app: body.inApp === true,
  }
}

/**
 * The sharer to pay for this visit (Owner 2026-11-27: a share earns merit when someone opens it):
 * only a first open in a browser, of a share with its id and the sharer's code. Opens inside the App
 * are paid by the App, which knows who opened. The code is used here and never stored.
 */
export function shareOpenAward(body, record) {
  if (!record || record.event !== 'open' || record.in_app || !record.share_id) return null
  const code = typeof body?.i === 'string' ? readShareParams(`?i=${encodeURIComponent(body.i)}`).i : undefined
  return code ? { code, shareId: record.share_id } : null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res, ['POST'])
    return
  }
  const address = String(req.headers?.['x-forwarded-for'] ?? '').split(',')[0].trim()
  if (!fromSharePage(req.headers) || !allowShareEvent(address)) {
    res.statusCode = 204
    res.setHeader('cache-control', 'no-store')
    res.end()
    return
  }
  try {
    // sendBeacon posts text/plain, which Vercel hands over as a string.
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : await readJsonBody(req)
    const record = shareEventRecord(body, String(req.headers?.['user-agent'] ?? ''))
    if (record) {
      const award = shareOpenAward(body, record)
      await Promise.all([
        insertShareEvent(record),
        // Before its migration (production today) the function is missing; the visit is still recorded.
        award ? awardShareOpen(award).catch(() => {}) : null,
      ])
    }
  } catch {
    // A report never breaks the page; a missing table (production before migration) is ignored too.
  }
  res.statusCode = 204
  res.setHeader('cache-control', 'no-store')
  res.end()
}
