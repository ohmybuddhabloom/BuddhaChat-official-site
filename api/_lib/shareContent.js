// Server side of the 1.4.5 share pages: turn /s/<type>/<id> into one normalized piece of content.
// Each type reads the public source the App itself reads; nothing here needs a signed-in user.
// Returns null when the content does not exist (404) and throws when the source is unavailable.

const TIMEOUT_MS = 8_000

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
    imageUrl: thumbs.large || thumbs.original || thumbs.medium || null,
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

async function loadYuanhui(id, env, fetcher) {
  const file = yuanhuiDataPath(id)
  if (!file) return null
  const body = await getJson(fetcher, `${env.yuanhuiSite}/assets/data/yuanhui/articles/${file}.json`)
  const raw = body?.['zh-CN']?.[id]
  if (!Array.isArray(raw) || raw.length === 0) return null
  const blocks = raw
    .filter((block) => typeof block?.text === 'string' && block.text && ['paragraph', 'heading', 'quote'].includes(block.type))
    .map((block) => ({ type: block.type, text: block.text }))
  if (!blocks.length) return null
  const first = blocks.find((block) => block.type === 'quote') ?? blocks[0]
  const title = plain(first.text).replace(/^问[:：]\s*/, '')
  const firstParagraph = blocks.find((block) => block.type === 'paragraph')
  // The question already is the page title; repeating it as the first quote reads twice.
  const articleBlocks = first === blocks[0] && first.type === 'quote' && blocks.length > 1 ? blocks.slice(1) : blocks
  return {
    title: summarize(title, 60),
    summary: summarize(firstParagraph?.text ?? title),
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
