export const RESERVED_SUBDOMAINS = new Set(['www', 'music', 'im', 'zentube', 'sutra'])
export const MASTER_ORIGIN = 'https://zentube.buddhachat.online'
export const SMART_LINK_HOST = 'go.buddhachat.online'
export const SMART_LINK_ORIGIN = process.env.SMART_LINK_ORIGIN || 'https://buddhabloom-admin.buddhachat.online'
export const SMART_LINK_PATHS = [
  /^\/\.well-known\/apple-app-site-association$/,
  /^\/\.well-known\/assetlinks\.json$/,
  /^\/api\/launch$/,
  /^\/api\/qr$/,
  /^\/l\/[A-Za-z0-9-]+$/,
]

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

export function isSmartLinkRequest(host, pathname) {
  return host === SMART_LINK_HOST && SMART_LINK_PATHS.some((pattern) => pattern.test(pathname))
}

export function smartLinkUpstreamUrl(requestUrl = '/') {
  const url = new URL(requestUrl, 'https://placeholder.local')
  return `${SMART_LINK_ORIGIN}${url.pathname}${url.search}`
}
