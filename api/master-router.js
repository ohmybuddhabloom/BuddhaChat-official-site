import { Buffer } from 'node:buffer'

const RESERVED_SUBDOMAINS = new Set(['www', 'music', 'im', 'zentube', 'sutra'])
const MASTER_ORIGIN = 'https://zentube.buddhachat.online'

export function masterSlugFromHost(host = '') {
  const match = host
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '')
    .match(/^([a-z0-9-]+)\.buddhachat\.online$/)
  const slug = match?.[1]
  return slug && !RESERVED_SUBDOMAINS.has(slug) ? slug : null
}

export function masterUpstreamUrl(slug, requestUrl = '/') {
  const query = new URL(requestUrl, 'https://placeholder.local').search
  return `${MASTER_ORIGIN}/__buddhachat_www/videos/topics/${slug}${query}`
}

export default async function handler(request, response) {
  const slug = masterSlugFromHost(
    request.headers['x-forwarded-host'] || request.headers.host
  )
  if (!slug) return response.status(404).send('Not Found')

  const upstream = await fetch(masterUpstreamUrl(slug, request.url), {
    method: request.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: { accept: request.headers.accept || 'text/html' },
  })
  const body =
    request.method === 'HEAD' ? null : Buffer.from(await upstream.arrayBuffer())

  for (const header of ['cache-control', 'content-type', 'x-robots-tag']) {
    const value = upstream.headers.get(header)
    if (value) response.setHeader(header, value)
  }
  return response.status(upstream.status).send(body)
}
