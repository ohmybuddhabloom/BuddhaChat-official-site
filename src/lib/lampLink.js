// 传灯 landing page (Owner 2026-11-22): https://www.buddhachat.online/lamp/<code>?c=<city>.
// It lives on www, which reaches Mainland WeChat through the Tokyo relay. The download buttons carry
// the same page link the App already reads after an install (store referrer, clipboard, iOS claim),
// so the friend's install still arrives with the sharer's referral code.
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/
const CITY_PATTERN = /^[\p{L}\p{M}\s.'·-]{1,40}$/u

const ENVIRONMENTS = {
  production: {
    site: 'https://www.buddhachat.online',
    linkHost: 'go.buddhachat.online',
    scheme: 'buddhachat',
    deferredLinkUrl: 'https://buddhabloom-admin.buddhachat.online/api/deferred-link',
    appStoreUrl: 'https://apps.apple.com/app/id6762049050',
    androidPackage: 'com.chriskevin.buddhachat',
  },
  staging: {
    site: 'https://staging.buddhachat.online',
    linkHost: 'staging-admin.buddhachat.online',
    scheme: 'buddhachat-staging',
    deferredLinkUrl: 'https://staging-admin.buddhachat.online/api/deferred-link',
    // Staging ships through TestFlight and direct install, never through a store listing.
    appStoreUrl: null,
    androidPackage: null,
  },
}

export function readLampCode(pathname) {
  const match = /^\/lamp\/([^/]+)\/?$/.exec(pathname || '')
  if (!match) return null
  let code
  try {
    code = decodeURIComponent(match[1]).trim().toUpperCase()
  } catch {
    return null
  }
  return CODE_PATTERN.test(code) ? code : null
}

/** The sharer's city as the App wrote it; anything that is not a plain place name is dropped. */
export function readLampCity(search) {
  let value = ''
  try {
    value = new URLSearchParams(search || '').get('c')?.trim() ?? ''
  } catch {
    return null
  }
  return CITY_PATTERN.test(value) ? value : null
}

// The backup share domain (Owner 2026-11-28) serves this page too: it keeps its environment, and the
// download links people open stay on it; the invite page handed to the App stays on the main site.
const STAGING_HOSTS = new Set(['staging.buddhachat.online', 'staging.buddhachat.net'])
const BACKUP_HOSTS = new Set(['buddhachat.net', 'www.buddhachat.net', 'staging.buddhachat.net'])

export function lampLinks(code, hostname) {
  const host = String(hostname ?? '').toLowerCase()
  const config = STAGING_HOSTS.has(host) ? ENVIRONMENTS.staging : ENVIRONMENTS.production
  const visible = BACKUP_HOSTS.has(host) ? `https://${host}` : config.site
  // The App's referral parser reads exactly this page: the site's front page carrying invite=<code>.
  const target = `${config.site}/?invite=${encodeURIComponent(code)}`
  const link = `https://${config.linkHost}/l/page?url=${encodeURIComponent(target)}`
  const appUrl = `${config.scheme}://l/page?url=${encodeURIComponent(target)}`
  const googlePlayUrl = config.androidPackage
    ? `https://play.google.com/store/apps/details?id=${config.androidPackage}&referrer=${encodeURIComponent(
      `utm_source=h5_lamp&deep_link=${encodeURIComponent(link)}`,
    )}`
    : null
  return {
    target,
    link,
    appUrl,
    appStoreUrl: config.appStoreUrl,
    googlePlayUrl,
    apkUrl: `${visible}/downloads/android/latest.apk`,
    downloadUrl: `${visible}/download`,
    deferredLinkUrl: config.deferredLinkUrl,
  }
}
