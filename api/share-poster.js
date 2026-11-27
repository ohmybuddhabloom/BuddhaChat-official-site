// /s/<type>/<id>/poster.png?size=story|feed: the share page as a poster with a QR code back to it.
import { readSharePath, readShareParams, SHARE_HOST_HEADER, shareEnvironmentFor, shareLinks } from '../src/lib/sharePage.js'
import { loadShareContent } from './_lib/shareContent.js'
import { renderPoster } from './_lib/sharePoster.js'
import { fetchCoverJpeg } from './share-card.js'
import { getPublicOrigin, PUBLIC_ORIGINS } from './_lib/public-origin.js'

// At most two renders at once per instance; more answer 503 and the App retries.
let rendering = 0
export const MAX_CONCURRENT_RENDERS = 2

export async function loadSharePoster(url, environmentName, fetcher = fetch, shareHost = null) {
  // The QR leads back to the host the poster was asked for (the backup share domain included).
  const env = shareEnvironmentFor(environmentName, shareHost)
  const type = url.searchParams.get('type')
  const id = url.searchParams.get('id')
  const share = readSharePath(`/s/${type}/${encodeURIComponent(String(id ?? ''))}/card.jpg`)
  if (!share || share.type === 'sutra') return { status: 404 }
  const params = readShareParams(url.search)
  const content = await loadShareContent(share.type, share.id, env, fetcher, params)
  if (!content) return { status: 404 }
  // The QR opens the same share page; ch=poster tells which way it travelled, the rest is kept.
  const links = shareLinks(env, share.type, share.id, { ...params, ch: 'poster' })
  if (rendering >= MAX_CONCURRENT_RENDERS) return { status: 503 }
  rendering += 1
  try {
    const cover = await fetchCoverJpeg(content.imageUrl, fetcher).catch(() => null)
    const png = await renderPoster({
      content,
      qrUrl: links.page,
      size: url.searchParams.get('size') === 'feed' ? 'feed' : 'story',
      locale: params.l,
      coverBytes: cover || null,
      fetcher,
    })
    return { status: 200, png }
  } finally {
    rendering -= 1
  }
}

export default async function handler(req, res) {
  const url = new URL(req.url, PUBLIC_ORIGINS.production)
  const environmentName = getPublicOrigin(req) === PUBLIC_ORIGINS.staging ? 'staging' : 'production'
  res.setHeader('vary', SHARE_HOST_HEADER)
  let poster
  try {
    poster = await loadSharePoster(url, environmentName, fetch, req.headers?.[SHARE_HOST_HEADER])
  } catch {
    poster = { status: 503 }
  }
  if (poster.status !== 200) {
    res.statusCode = poster.status
    // A missing item may be cached briefly; a busy or failed render is retried, never cached.
    res.setHeader('cache-control', poster.status === 404 ? 'public, s-maxage=60' : 'no-store')
    res.end()
    return
  }
  res.statusCode = 200
  res.setHeader('content-type', 'image/png')
  // The QR carries the sharer's values, so each link is its own image; content changes show within a day.
  res.setHeader('cache-control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600')
  res.end(poster.png)
}
