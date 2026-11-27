import { MUSIC_CATALOG } from '../../src/lib/sharePage.js'
// Server side of the 1.4.5 share pages: turn /s/<type>/<id> into one normalized piece of content.
// Each type reads the public source the App itself reads; nothing here needs a signed-in user.
// Returns null when the content does not exist (404) and throws when the source is unavailable.

// Two upstream reads (content, then the cover) must fit the 10 s function limit with room to answer.
export const TIMEOUT_MS = 4_000

// Covers are fetched server side, so only these HTTPS image hosts are ever requested.
const IMAGE_HOSTS = [
  /^customer-[a-z0-9]+\.cloudflarestream\.com$/,
  /^videodelivery\.net$/,
  /^imagedelivery\.net$/,
  /^(?:staging-)?yuanhui\.buddhachat\.online$/,
  /^buddha-tokyo-1300001083\.cos\.ap-tokyo\.myqcloud\.com$/,
]

/** A cover we may fetch, sized for a 1200×630 card when the host can crop; anything else is dropped. */
export function safeImageUrl(value) {
  let url
  try {
    url = new URL(String(value ?? ''))
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
  // The 佛乐 site's own artwork and the public 藏经阁 bucket are allowed only by path.
  const pathAllowed = (/^www\.buddhachat\.online$/.test(url.hostname) && /^\/music\/assets\/[A-Za-z0-9._-]+\.(?:jpe?g|png|webp)$/i.test(url.pathname))
    || (/^(?:xqibxlpzghveyqemprjr|bjswjgadnariutxibsfh)\.supabase\.co$/.test(url.hostname) && /^\/storage\/v1\/object\/public\/cangjing\//.test(url.pathname))
  if (!pathAllowed && !IMAGE_HOSTS.some((host) => host.test(url.hostname))) return null
  if (url.pathname.includes('..')) return null
  if (/\.cloudflarestream\.com$/.test(url.hostname)) {
    url.searchParams.set('width', '1200')
    url.searchParams.set('height', '630')
    url.searchParams.set('fit', 'crop')
  }
  return url.toString()
}

/** The stable card image address for a share page (served by api/share-card.js). */
export const shareCardUrl = (canonicalUrl) => `${canonicalUrl}/card.jpg`

/** The poster of a share page link (served by api/share-poster.js), keeping who shared it. */
export function sharePosterUrl(pageUrl, size = 'story') {
  const page = new URL(pageUrl)
  const poster = new URL(`${page.origin}${page.pathname}/poster.png`)
  page.searchParams.forEach((value, key) => poster.searchParams.set(key, value))
  poster.searchParams.set('size', size)
  return poster.toString()
}

const plain = (value) => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

export function summarize(text, max = 110) {
  const value = plain(text)
  if (value.length <= max) return value
  return `${value.slice(0, max - 1).trimEnd()}…`
}

async function getJson(fetcher, url) {
  const response = await fetcher(url, {
    headers: { accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`share source ${response.status}`)
  return response.json()
}

async function loadVideo(id, env, fetcher) {
  const body = await getJson(fetcher, `${env.zentubeApi}/videos/${encodeURIComponent(id)}`)
  const video = body?.data ?? body
  if (!video || video.id !== id) return null
  // Only a published public video plays on the page; anything else shows its cover and opens in the App.
  const playable = video.isPublic === true && video.status === 'published' && (video.accessPolicy ?? 'public') === 'public'
  const thumbs = video.thumbnailUrls ?? {}
  return {
    title: plain(video.title) || 'BuddhaChat',
    summary: summarize(video.description) || summarize(video.title),
    author: plain(video.author?.displayName) || null,
    imageUrl: safeImageUrl(thumbs.large || thumbs.original || thumbs.medium),
    blocks: [],
    media: playable
      ? { kind: 'video', embedUrl: `${env.site}/videos/embed/${encodeURIComponent(id)}`, durationSec: Number(video.duration) || null }
      : { kind: 'cover', embedUrl: null, durationSec: Number(video.duration) || null },
  }
}

async function loadQuestion(id, env, fetcher) {
  const body = await getJson(fetcher, `${env.supabase}/functions/v1/public-question?topic_id=${encodeURIComponent(id)}`)
  const q = body?.question
  if (!q) return null
  if (body.environment !== env.name || q.item_id !== `topic:${id}` || typeof q.title !== 'string' || typeof q.body !== 'string') {
    throw new Error('share source: invalid question')
  }
  const blocks = [{ type: 'question', text: plain(q.body) }]
  if (q.answer?.body) blocks.push({ type: 'answer', text: String(q.answer.body).trim(), author: plain(q.answer.author_name) || null })
  return {
    title: plain(q.title),
    summary: summarize(q.answer?.body || q.body),
    // Defense in depth: never show an anonymous asker's name.
    author: q.answer?.author_name ? plain(q.answer.author_name) : null,
    imageUrl: null,
    blocks,
    media: null,
  }
}

function yuanhuiDataPath(id) {
  if (/^yuanhui-topic-q\d{3}$/.test(id)) return 'supplemental'
  const match = /^yuanhui-(\d{3})-q\d{3}$/.exec(id)
  return match ? match[1] : null
}

/** Reads at most `limit` bytes of a body as text; anything longer is cut off and the read cancelled. */
async function readTextCapped(response, limit) {
  if (!response.body?.getReader) return (await response.text()).slice(0, limit)
  const reader = response.body.getReader()
  const chunks = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    total += value.length
    if (total >= limit) {
      await reader.cancel().catch(() => {})
      break
    }
  }
  return new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).subarray(0, limit))
}

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }

/** One pass over HTML character references, as a browser decodes an attribute value. */
export function decodeEntities(value) {
  return String(value).replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8}|#39);/gi, (match, name) => {
    const lower = name.toLowerCase()
    if (Object.hasOwn(NAMED_ENTITIES, lower)) return NAMED_ENTITIES[lower]
    const code = lower.startsWith('#x') ? Number.parseInt(lower.slice(2), 16) : lower.startsWith('#') ? Number.parseInt(lower.slice(1), 10) : NaN
    return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
  })
}

/** og:title from a page's <head>, whatever the attribute order or quotes; comments are skipped. */
export function readOgTitle(html) {
  const head = String(html).replace(/<!--[\s\S]*?-->/g, '').split(/<\/head>/i)[0]
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const attributes = {}
    for (const [, name, , , double, single, bare] of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(("([^"]*)")|'([^']*)'|([^\s"'>]+))/g)) {
      attributes[name.toLowerCase()] = double ?? single ?? bare ?? ''
    }
    if (attributes.property?.toLowerCase() === 'og:title' && attributes.content) return plain(decodeEntities(attributes.content))
  }
  return null
}

/** The catalog title the App and the 源慧 site show, read from the article page's own card. */
async function yuanhuiCatalogTitle(id, env, fetcher) {
  try {
    const response = await fetcher(`${env.yuanhuiSite}/articles/${encodeURIComponent(id)}`, {
      headers: { accept: 'text/html' },
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) return null
    return readOgTitle(await readTextCapped(response, 64 * 1024)) || null
  } catch {
    return null
  }
}

async function loadYuanhui(id, env, fetcher, params = {}) {
  const file = yuanhuiDataPath(id)
  if (!file) return null
  const [body, catalogTitle] = await Promise.all([
    getJson(fetcher, `${env.yuanhuiSite}/assets/data/yuanhui/articles/${file}.json`),
    yuanhuiCatalogTitle(id, env, fetcher),
  ])
  // A Traditional Chinese sharer's link reads the site's own Traditional text when it has one.
  const traditional = params.l === 'zh-Hant' ? body?.['zh-TW']?.[id] : null
  const raw = Array.isArray(traditional) && traditional.length ? traditional : body?.['zh-CN']?.[id]
  if (!Array.isArray(raw) || raw.length === 0) return null
  const blocks = raw
    .filter((block) => typeof block?.text === 'string' && block.text && ['paragraph', 'heading', 'quote'].includes(block.type))
    .map((block) => ({ type: block.type, text: block.text }))
  if (!blocks.length) return null
  const first = blocks.find((block) => block.type === 'quote') ?? blocks[0]
  const question = plain(first.text).replace(/^问[:：]\s*/, '')
  const firstParagraph = blocks.find((block) => block.type === 'paragraph')
  // With the catalog title the question stays in the body, as in the App; without it the question is
  // the title, and repeating it as the first quote would read twice.
  const articleBlocks = !catalogTitle && first === blocks[0] && first.type === 'quote' && blocks.length > 1 ? blocks.slice(1) : blocks
  return {
    title: summarize(catalogTitle ?? question, 60),
    summary: summarize(firstParagraph?.text ?? question),
    author: '源慧法师',
    imageUrl: `${env.yuanhuiSite}/assets/images/share/yuanhui-card-v2.jpg`,
    blocks: articleBlocks,
    media: null,
  }
}

async function restRows(fetcher, base, anonKey, table, query) {
  const response = await fetcher(`${base}/rest/v1/${table}?${query}`, {
    headers: { apikey: anonKey, accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`share source ${response.status}`)
  const rows = await response.json()
  return Array.isArray(rows) ? rows : []
}

const formatMinutes = (seconds, locale) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (locale === 'en') return `${minutes} min`
  return locale === 'zh-Hant' ? `${minutes} 分鐘` : `${minutes} 分钟`
}

/** A published 佛乐 track: listen on the page, carry on in the App. */
async function loadMusic(id, env, fetcher, params = {}) {
  const rows = await restRows(fetcher, MUSIC_CATALOG.supabase, MUSIC_CATALOG.anonKey, 'music_tracks',
    `select=id,title,collection,duration_seconds,image_url,audio_url&id=eq.${encodeURIComponent(id)}&is_published=eq.true&limit=1`)
  const track = rows[0]
  if (!track || String(track.id) !== id || typeof track.title !== 'string') return null
  let audioUrl = null
  try {
    const published = new URL(track.audio_url)
    if (published.protocol === 'https:' && published.hostname === 'music.buddhachat.online' && published.pathname.startsWith('/audio/')) {
      audioUrl = new URL(published.pathname, MUSIC_CATALOG.audioOrigin).toString()
    }
  } catch {
    audioUrl = null
  }
  // The catalog is production's, so its artwork is too.
  const image = typeof track.image_url === 'string' && /^\/assets\/[A-Za-z0-9._-]+$/.test(track.image_url) ? `https://www.buddhachat.online/music${track.image_url}` : null
  const length = formatMinutes(Number(track.duration_seconds), params.l)
  return {
    title: plain(track.title),
    summary: [plain(track.collection), length].filter(Boolean).join(' · ') || '佛乐',
    author: plain(track.collection) || null,
    imageUrl: safeImageUrl(image),
    blocks: [],
    media: audioUrl ? { kind: 'audio', audioUrl, durationSec: Number(track.duration_seconds) || null } : null,
  }
}

const CANGJING_LOCALES = { 'zh-Hans': ['zh-Hans', 'zh-Hant', 'en'], 'zh-Hant': ['zh-Hant', 'zh-Hans', 'en'], en: ['en', 'zh-Hans', 'zh-Hant'] }

/** A published 藏经阁 item, in the sharer's language when it has one. Row-level security keeps drafts out. */
async function loadCangjing(id, env, fetcher, params = {}) {
  const rows = await restRows(fetcher, env.mainSupabase, env.mainAnonKey, 'cangjing_items',
    // Row-level security already shows anon only published items and reviewed translations; the
    // filters say so again so a policy change can never publish a draft through a share page.
    `select=id,cover_url,cangjing_item_translations(locale,title,summary,era_label,place_label,body)&id=eq.${encodeURIComponent(id)}&status=eq.published&cangjing_item_translations.review_status=eq.reviewed&limit=1`)
  const item = rows[0]
  if (!item || item.id !== id) return null
  const translations = Array.isArray(item.cangjing_item_translations) ? item.cangjing_item_translations : []
  const order = CANGJING_LOCALES[params.l] ?? CANGJING_LOCALES['zh-Hans']
  const picked = order.map((locale) => translations.find((t) => t.locale === locale)).find((t) => t?.title) ?? translations.find((t) => t?.title)
  if (!picked) return null
  const blocks = (Array.isArray(picked.body) ? picked.body : [])
    .filter((block) => typeof block?.text === 'string' && block.text && ['paragraph', 'heading', 'quote'].includes(block.type))
    .map((block) => ({ type: block.type, text: block.text }))
  return {
    title: plain(picked.title),
    summary: summarize(picked.summary || blocks.find((block) => block.type === 'paragraph')?.text || picked.title),
    author: [plain(picked.era_label), plain(picked.place_label)].filter(Boolean).join(' · ') || null,
    imageUrl: safeImageUrl(item.cover_url),
    blocks,
    media: null,
  }
}

const LOADERS = { video: loadVideo, qa: loadQuestion, yuanhui: loadYuanhui, music: loadMusic, cangjing: loadCangjing }

export async function loadShareContent(type, id, env, fetcher = fetch, params = {}) {
  if (!Object.hasOwn(LOADERS, type)) return null
  const content = await LOADERS[type](id, env, fetcher, params)
  return content ? { type, id, ...content } : null
}
