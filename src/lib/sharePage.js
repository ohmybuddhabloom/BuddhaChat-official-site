// 1.4.5 任务8（全套分享）: one share page per piece of content, https://www.buddhachat.online/s/<type>/<id>.
// It lives on www, which Mainland WeChat reaches through the Tokyo relay. Every link carries who shared
// it (r), where it was sent (ch), how many hands it has passed (h), the sharer's invite code (i) and the
// sharer's language (l). The "open in App" and download buttons carry this same page, so the App can land
// on the same content after an install, exactly like the 传灯 page.
const REFERRAL_CODE = /^[A-HJ-NP-Z2-9]{8}$/

const ENVIRONMENTS = {
  production: {
    name: 'production',
    site: 'https://www.buddhachat.online',
    linkHost: 'go.buddhachat.online',
    scheme: 'buddhachat',
    deferredLinkUrl: 'https://buddhabloom-admin.buddhachat.online/api/deferred-link',
    appStoreUrl: 'https://apps.apple.com/app/id6762049050',
    androidPackage: 'com.chriskevin.buddhachat',
    zentubeApi: 'https://zentube.buddhachat.online/api',
    yuanhuiSite: 'https://yuanhui.buddhachat.online',
    // The project that serves public-question (production keeps forum functions in the main project).
    supabase: 'https://xqibxlpzghveyqemprjr.supabase.co',
    // The main project and its anon key: public rows only, enforced by row-level security. Anon keys
    // ship inside every App build, so they are public by design.
    mainSupabase: 'https://xqibxlpzghveyqemprjr.supabase.co',
    mainAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxaWJ4bHB6Z2h2ZXlxZW1wcmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MjcyNzIsImV4cCI6MjA4OTMwMzI3Mn0.BrNRiY0LL-DwLLY4NVX6gXh1tAWcxiSKcDs4nxS9hYI',
  },
  staging: {
    name: 'staging',
    site: 'https://staging.buddhachat.online',
    linkHost: 'staging-admin.buddhachat.online',
    scheme: 'buddhachat-staging',
    deferredLinkUrl: 'https://staging-admin.buddhachat.online/api/deferred-link',
    // Staging ships through TestFlight and direct install, never through a store listing.
    appStoreUrl: null,
    androidPackage: null,
    zentubeApi: 'https://staging-zentube.buddhachat.online/api',
    yuanhuiSite: 'https://staging-yuanhui.buddhachat.online',
    // Staging's forum functions (public-question) run on the staging bridge project, not the main one.
    supabase: 'https://lsiycbdglqtltlecvzky.supabase.co',
    mainSupabase: 'https://bjswjgadnariutxibsfh.supabase.co',
    mainAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqc3dqZ2FkbmFyaXV0eGlic2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MDAyMjgsImV4cCI6MjEwMDk3NjIyOH0.GpNtyO8yucoJHHc9TLES1_avoQ76hedD655kr-q6oho',
  },
}

// 佛乐 reads production's catalog in both environments (the App's EXPO_PUBLIC_MUSIC_SUPABASE_URL), and
// plays from the Tokyo copy of music.buddhachat.online/audio, which Mainland China reaches.
export const MUSIC_CATALOG = {
  supabase: 'https://xqibxlpzghveyqemprjr.supabase.co',
  anonKey: ENVIRONMENTS.production.mainAnonKey,
  audioOrigin: 'https://buddha-tokyo-1300001083.cos.ap-tokyo.myqcloud.com',
}

const STAGING_HOSTS = /^(?:staging\.buddhachat\.online|buddha-chat-official-site-env-staging-chenjunyu-1990s-projects\.vercel\.app)$/i

export function shareEnvironment(hostname) {
  return STAGING_HOSTS.test(String(hostname || '')) ? ENVIRONMENTS.staging : ENVIRONMENTS.production
}

export function shareEnvironmentNamed(name) {
  return name === 'staging' ? ENVIRONMENTS.staging : ENVIRONMENTS.production
}

// 1.4.5 任务8 (Owner 2026-11-28): the backup share domain buddhachat.net serves this site through the
// Tokyo relay, which names the host the visitor used in this header. A page opened there keeps every
// link on that host, so a share that went out on the backup domain never leads back to a blocked one.
export const SHARE_HOST_HEADER = 'x-buddhachat-share-host'
const BACKUP_SHARE_HOSTS = {
  production: new Set(['buddhachat.net', 'www.buddhachat.net']),
  staging: new Set(['staging.buddhachat.net']),
}

/** The environment as seen from the visitor's host; any host but this environment's backup is ignored. */
export function shareEnvironmentFor(name, shareHost) {
  const env = shareEnvironmentNamed(name)
  const host = String(shareHost ?? '').trim().toLowerCase()
  const backups = name === 'staging' ? BACKUP_SHARE_HOSTS.staging : BACKUP_SHARE_HOSTS.production
  return backups.has(host) ? { ...env, site: `https://${host}` } : env
}

/** The content each share page can show, and the exact id shape it accepts. */
export const SHARE_ID_PATTERNS = {
  video: /^[A-Za-z0-9_-]{11}$/,
  qa: /^[1-9]\d{0,15}$/,
  yuanhui: /^yuanhui-(?:\d{3}-q\d{3}|topic-q\d{3})$/,
  sutra: /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/,
  // The music catalog's identifiers (the App's musicTrackId): positive integers or UUIDs.
  music: /^(?:[1-9]\d{0,18}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
  // cangjing_items ids are 2–96 characters.
  cangjing: /^[a-z0-9][a-z0-9-]{1,95}$/,
}

/** `/s/<type>/<id>`, or its card image (`…/card` plus the jpg suffix); anything else is not a share page. */
export function readSharePath(pathname) {
  const match = /^\/s\/([a-z]+)\/([^/]+)(\/card\.jpg)?\/?$/.exec(pathname || '')
  if (!match) return null
  const [, type, rawId, card] = match
  if (!Object.hasOwn(SHARE_ID_PATTERNS, type)) return null
  const pattern = SHARE_ID_PATTERNS[type]
  let id
  try {
    id = decodeURIComponent(rawId)
  } catch {
    return null
  }
  if (!pattern.test(id)) return null
  return { type, id, asset: card ? 'card' : null }
}

const PARAM_PATTERNS = {
  r: /^[A-Za-z0-9_-]{6,40}$/,
  ch: /^[a-z0-9_]{1,24}$/,
  i: REFERRAL_CODE,
  l: /^(?:zh-Hans|zh-Hant|en)$/,
}

/** Only well-formed tracking values survive; a hand-edited link never breaks the page. */
export function readShareParams(search) {
  let params
  try {
    params = new URLSearchParams(search || '')
  } catch {
    return {}
  }
  const out = {}
  for (const [key, pattern] of Object.entries(PARAM_PATTERNS)) {
    const value = params.get(key)?.trim()
    if (value && pattern.test(value)) out[key] = value
  }
  const hop = Number(params.get('h'))
  if (Number.isInteger(hop) && hop >= 1 && hop <= 99) out.h = hop
  return out
}

function withParams(url, params) {
  const page = new URL(url)
  for (const key of ['r', 'ch', 'h', 'i', 'l']) {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') page.searchParams.set(key, String(params[key]))
  }
  return page.toString()
}

export function shareCanonicalUrl(env, type, id) {
  return `${env.site}/s/${type}/${encodeURIComponent(id)}`
}

export function shareLinks(env, type, id, params = {}) {
  const canonical = shareCanonicalUrl(env, type, id)
  const page = withParams(canonical, params)
  const link = `https://${env.linkHost}/l/page?url=${encodeURIComponent(page)}`
  const appUrl = `${env.scheme}://l/page?url=${encodeURIComponent(page)}`
  const googlePlayUrl = env.androidPackage
    ? `https://play.google.com/store/apps/details?id=${env.androidPackage}&referrer=${encodeURIComponent(
      `utm_source=h5_share&deep_link=${encodeURIComponent(link)}`,
    )}`
    : null
  // Passing the page on keeps the first sharer and counts one more hand.
  const reshare = withParams(canonical, { ...params, ch: 'web', h: Math.min((params.h ?? 1) + 1, 99) })
  return {
    canonical,
    page,
    link,
    appUrl,
    appStoreUrl: env.appStoreUrl,
    googlePlayUrl,
    apkUrl: `${env.site}/downloads/android/latest.apk`,
    downloadUrl: `${env.site}/download`,
    deferredLinkUrl: env.deferredLinkUrl,
    reshare,
  }
}

/** Article pages show about 40% before offering the App (Owner 11-27: soft guide, no wall). */
export function previewBlockCount(total) {
  if (total <= 3) return total
  return Math.max(2, Math.ceil(total * 0.4))
}

/** A video offers the App after about a third of its length on screen, between one and ten minutes. */
export function videoGuideDelaySec(durationSec) {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return 120
  return Math.min(600, Math.max(60, Math.round(durationSec / 3)))
}

// The App drops a bridge message longer than 4096 characters, so the title gives way first.
const APP_BRIDGE_LIMIT = 4096
export function appShareMessage(title, url) {
  const message = (text) => JSON.stringify({ version: 1, action: 'share', payload: { url, text } })
  let caption = String(title ?? '').slice(0, 200)
  while (caption && message(`${caption}\n${url}`).length > APP_BRIDGE_LIMIT) caption = caption.slice(0, -10)
  const full = message(caption ? `${caption}\n${url}` : url)
  return full.length <= APP_BRIDGE_LIMIT ? full : JSON.stringify({ version: 1, action: 'share', payload: { url } })
}

/** Reports one share page event; never blocks or fails the page. */
export function reportShareEvent(event, data, inApp = false) {
  try {
    const params = data?.params ?? {}
    // The sharer's code goes along only on the first open: the server pays that sharer once per share.
    const body = JSON.stringify({ event, type: data?.type, id: data?.id, r: params.r, ch: params.ch, h: params.h, l: params.l, i: event === 'open' ? params.i : undefined, inApp })
    const blob = new Blob([body], { type: 'text/plain' })
    if (!globalThis.navigator?.sendBeacon?.('/api/share-event', blob)) {
      globalThis.fetch?.('/api/share-event', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => {})
    }
  } catch {
    // Reporting is best effort.
  }
}
