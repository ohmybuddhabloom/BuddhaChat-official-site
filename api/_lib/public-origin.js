export const PUBLIC_ORIGINS = Object.freeze({
  production: 'https://www.buddhachat.online',
  staging: 'https://staging.buddhachat.online',
})

const STAGING_HOSTS = new Set([
  'staging.buddhachat.online',
  'buddha-chat-official-site-env-staging-chenjunyu-1990s-projects.vercel.app',
])

export function getPublicOrigin(req, env = process.env) {
  const target = String(env.VERCEL_TARGET_ENV ?? env.VERCEL_ENV ?? '').toLowerCase()
  if (target === 'production') return PUBLIC_ORIGINS.production
  if (target === 'staging' || env.VERCEL_GIT_COMMIT_REF === 'staging') return PUBLIC_ORIGINS.staging
  const host = String(req.headers?.host ?? '').split(':')[0].toLowerCase()
  if (STAGING_HOSTS.has(host) || target === 'preview') return PUBLIC_ORIGINS.staging
  return PUBLIC_ORIGINS.production
}

export function safeReturnUrl(value, origin) {
  try {
    const candidate = new URL(typeof value === 'string' ? value : '/', origin)
    if (candidate.origin === origin && !candidate.username && !candidate.password) return candidate.toString()
  } catch { /* An invalid return target falls back to the selected site's home. */ }
  return `${origin}/`
}
