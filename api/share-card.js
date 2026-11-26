// The image a chat app shows for /s/<type>/<id>: a stable address on www for the content's cover.
// Video covers upstream are signed Cloudflare URLs that expire, so a card must never point at them.
import { readSharePath, shareEnvironment } from '../src/lib/sharePage.js'
import { loadShareContent } from './_lib/shareContent.js'

const MAX_BYTES = 5 * 1024 * 1024

export async function loadShareCard(type, id, hostname, fetcher = fetch) {
  const share = readSharePath(`/s/${type}/${encodeURIComponent(String(id ?? ''))}/card.jpg`)
  const env = shareEnvironment(hostname)
  const fallback = `${env.site}/share/official-card-v1.jpg`
  if (!share) return { redirect: fallback }
  let content
  try {
    content = await loadShareContent(share.type, share.id, env, fetcher)
  } catch {
    return { redirect: fallback, cache: 'public, s-maxage=60' }
  }
  if (!content?.imageUrl) return { redirect: fallback }
  const response = await fetcher(content.imageUrl, { redirect: 'follow', signal: AbortSignal.timeout(8_000) })
  const type_ = response.headers.get('content-type') || ''
  if (!response.ok || !/^image\/(?:jpeg|png|webp)\b/i.test(type_)) return { redirect: fallback, cache: 'public, s-maxage=60' }
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length === 0 || bytes.length > MAX_BYTES) return { redirect: fallback }
  return { bytes, contentType: type_.split(';')[0] }
}

export default async function handler(req, res) {
  const url = new URL(req.url, 'https://www.buddhachat.online')
  const card = await loadShareCard(
    url.searchParams.get('type'),
    url.searchParams.get('id'),
    req.headers?.['x-forwarded-host'] || req.headers?.host,
  ).catch(() => ({ redirect: 'https://www.buddhachat.online/share/official-card-v1.jpg', cache: 'public, s-maxage=60' }))
  if (card.redirect) {
    res.statusCode = 302
    res.setHeader('location', card.redirect)
    res.setHeader('cache-control', card.cache ?? 'public, s-maxage=3600')
    res.end()
    return
  }
  res.statusCode = 200
  res.setHeader('content-type', card.contentType)
  res.setHeader('cache-control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800')
  res.end(card.bytes)
}
