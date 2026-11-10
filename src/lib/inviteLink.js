// Shared by the /join landing page and its tests.
const CODE_PATTERN = /^[A-Za-z0-9-]{4,64}$/

export function readInviteCode(pathname) {
  const match = /^\/join\/([^/]+)\/?$/.exec(pathname || '')
  if (!match) return null
  let code
  try {
    code = decodeURIComponent(match[1])
  } catch {
    return null
  }
  return CODE_PATTERN.test(code) ? code : null
}

// staging.buddhachat.online serves the Staging App, which registers its own scheme.
export function inviteAppLink(code, hostname) {
  const scheme = hostname === 'staging.buddhachat.online' ? 'buddhachat-staging' : 'buddhachat'
  return `${scheme}://join/${encodeURIComponent(code)}`
}
