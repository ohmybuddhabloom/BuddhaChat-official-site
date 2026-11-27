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
  if (!IMAGE_HOSTS.some((host) => host.test(url.hostname))) return null
  if (/\.cloudflarestream\.com$/.test(url.hostname)) {
    url.searchParams.set('width', '1200')
    url.searchParams.set('height', '630')
    url.searchParams.set('fit', 'crop')
  }
  return url.toString()
}

/** The stable card image address for a share page (served by api/share-card.js). */
export const shareCardUrl = (canonicalUrl) => `${canonicalUrl}/card.jpg`

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

/** The catalog title the App and the 源慧 site show, read from the article page's own card. */
async function yuanhuiCatalogTitle(id, env, fetcher) {
  try {
    const response = await fetcher(`${env.yuanhuiSite}/articles/${encodeURIComponent(id)}`, {
      headers: { accept: 'text/html' },
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) return null
    const html = (await response.text()).slice(0, 20_000)
    const match = /<meta\s+property="og:title"\s+content="([^"]{1,200})"/i.exec(html)
    const title = match ? plain(match[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")) : ''
    return title || null
  } catch {
    return null
  }
}

async function loadYuanhui(id, env, fetcher) {
  const file = yuanhuiDataPath(id)
  if (!file) return null
  const [body, catalogTitle] = await Promise.all([
    getJson(fetcher, `${env.yuanhuiSite}/assets/data/yuanhui/articles/${file}.json`),
    yuanhuiCatalogTitle(id, env, fetcher),
  ])
  const raw = body?.['zh-CN']?.[id]
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

const LOADERS = { video: loadVideo, qa: loadQuestion, yuanhui: loadYuanhui }

export async function loadShareContent(type, id, env, fetcher = fetch) {
  const loader = LOADERS[type]
  if (!loader) return null
  const content = await loader(id, env, fetcher)
  return content ? { type, id, ...content } : null
}
