import { Buffer } from 'node:buffer'

const RESERVED_SUBDOMAINS = new Set([
  'www',
  'music',
  'im',
  'zentube',
  'sutra',
  'videos',
  'api',
])
const PRODUCTION_MASTER_ORIGIN = 'https://zentube.buddhachat.online'

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

export function masterSlugFromPath(pathname = '', environment = process.env.VERCEL_ENV) {
  if (environment !== 'preview') return null
  const slug = pathname.toLowerCase().match(/^\/([a-z0-9-]+)\/?$/)?.[1]
  return slug && !RESERVED_SUBDOMAINS.has(slug) ? slug : null
}

export function masterOriginForEnvironment(
  environment = process.env.VERCEL_ENV,
  configuredOrigin = process.env.MASTER_ORIGIN,
) {
  const origin = configuredOrigin?.trim().replace(/\/+$/, '')
  if (environment === 'preview' && (!origin || origin === PRODUCTION_MASTER_ORIGIN)) {
    return null
  }
  return origin || PRODUCTION_MASTER_ORIGIN
}

export function masterUpstreamUrl(
  slug,
  requestUrl = '/',
  origin = masterOriginForEnvironment(),
) {
  if (!origin) throw new Error('MASTER_ORIGIN is required for Preview')
  const query = new URL(requestUrl, 'https://placeholder.local').search
  return `${origin}/${query}`
}

export function masterUpstreamHeaders(
  accept = 'text/html',
  environment = process.env.VERCEL_ENV,
  bypass = process.env.UPSTREAM_PROTECTION_BYPASS,
  slug,
) {
  const headers = { accept }
  if (slug) {
    headers['x-forwarded-host'] = `${slug}.buddhachat.online`
    headers['x-forwarded-proto'] = 'https'
  }
  if (environment === 'preview' && bypass) {
    headers['x-vercel-protection-bypass'] = bypass
  }
  return headers
}

export default async function handler(request, response) {
  const requestUrl = new URL(request.url, 'https://placeholder.local')
  const hostSlug = masterSlugFromHost(
    request.headers['x-forwarded-host'] || request.headers.host
  )
  const slug = hostSlug || masterSlugFromPath(requestUrl.pathname)
  if (!slug || (hostSlug && requestUrl.pathname !== '/')) {
    return response.status(404).send('Not Found')
  }

  const origin = masterOriginForEnvironment()
  if (!origin) {
    return response.status(503).send('Staging origin is not configured')
  }

  const upstream = await fetch(masterUpstreamUrl(slug, request.url, origin), {
    method: request.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: masterUpstreamHeaders(request.headers.accept || 'text/html', undefined, undefined, slug),
  })
  const body =
    request.method === 'HEAD' ? null : Buffer.from(await upstream.arrayBuffer())

  for (const header of ['cache-control', 'content-type', 'x-robots-tag']) {
    const value = upstream.headers.get(header)
    if (value) response.setHeader(header, value)
  }
  return response.status(upstream.status).send(body)
}
