// The image a chat app shows for /s/<type>/<id>: a stable address on www for the content's cover.
// Video covers upstream are signed Cloudflare URLs that expire, so a card must never point at them.
import { readSharePath, shareEnvironmentNamed } from '../src/lib/sharePage.js'
import { loadShareContent, safeImageUrl, TIMEOUT_MS } from './_lib/shareContent.js'
import { getPublicOrigin, PUBLIC_ORIGINS } from './_lib/public-origin.js'

const MAX_BYTES = 2 * 1024 * 1024

/** Reads at most `limit` bytes; a larger body is abandoned instead of buffered. */
async function readCapped(response, limit) {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > limit) return null
  if (!response.body?.getReader) {
    const bytes = Buffer.from(await response.arrayBuffer())
    return bytes.length > limit ? null : bytes
  }
  const reader = response.body.getReader()
  const chunks = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > limit) {
      await reader.cancel().catch(() => {})
      return null
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
}

/**
 * A content cover as JPEG bytes: null when there is no allowed cover, false when the host answered
 * something else (a short cache then retries). Shared by the card and the poster.
 */
export async function fetchCoverJpeg(rawUrl, fetcher = fetch) {
  // The content loader already keeps only allowed hosts; checked again because this is the fetch.
  const imageUrl = safeImageUrl(rawUrl)
  if (!imageUrl) return null
  const response = await fetcher(imageUrl, { redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS) })
  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  // The page declares a JPEG card, so only a JPEG is passed through.
  if (!response.ok || contentType !== 'image/jpeg') return false
  const bytes = await readCapped(response, MAX_BYTES)
  return bytes?.length ? bytes : null
}

export async function loadShareCard(type, id, environmentName, fetcher = fetch) {
  const env = shareEnvironmentNamed(environmentName)
  const fallback = { redirect: `${env.site}/share/official-card-v1.jpg` }
  const share = readSharePath(`/s/${type}/${encodeURIComponent(String(id ?? ''))}/card.jpg`)
  if (!share) return fallback
  try {
    const content = await loadShareContent(share.type, share.id, env, fetcher)
    const bytes = await fetchCoverJpeg(content?.imageUrl, fetcher)
    if (bytes === null) return fallback
    if (bytes === false) return { ...fallback, cache: 'public, s-maxage=60' }
    return { bytes, contentType: 'image/jpeg' }
  } catch {
    return { ...fallback, cache: 'public, s-maxage=60' }
  }
}

export default async function handler(req, res) {
  const url = new URL(req.url, PUBLIC_ORIGINS.production)
  const environmentName = getPublicOrigin(req) === PUBLIC_ORIGINS.staging ? 'staging' : 'production'
  const card = await loadShareCard(url.searchParams.get('type'), url.searchParams.get('id'), environmentName)
  if (card.redirect) {
    res.statusCode = 302
    res.setHeader('location', card.redirect)
    res.setHeader('cache-control', card.cache ?? 'public, s-maxage=3600')
    res.end()
    return
  }
  res.statusCode = 200
  res.setHeader('content-type', card.contentType)
  // A removed item's cover must stop being served within a day.
  res.setHeader('cache-control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600')
  res.end(card.bytes)
}
