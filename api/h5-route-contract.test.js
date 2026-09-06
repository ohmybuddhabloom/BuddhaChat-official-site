import { describe, expect, it } from 'vitest'
import routes from '../vercel.json'

describe('canonical H5 routing', () => {
  it.each(['/music', '/music/', '/videos', '/videos/'])('pins the exact %s entry to Staging before production fallbacks', (source) => {
    const candidates = routes.rewrites.filter((route) => route.source === source)
    const resolve = (host) => candidates.find((route) => !route.has || route.has.every((condition) => condition.type === 'host' && new RegExp(`^${condition.value}$`).test(host)))
    for (const host of ['staging.buddhachat.online', 'buddha-chat-official-site-env-staging-chenjunyu-1990s-projects.vercel.app']) {
      const selected = resolve(host)
      expect(selected?.has).toBeDefined()
      expect(selected.destination).toBe(source.startsWith('/music')
        ? 'https://buddhachat-music-env-staging-chenjunyu-1990s-projects.vercel.app/music/'
        : 'https://staging-zentube.buddhachat.online/__buddhachat_www/videos/')
    }
    expect(resolve('www.buddhachat.online')?.has).toBeUndefined()
    expect(resolve('staging.buddhachat.online.evil.test')?.has).toBeUndefined()
  })
  it('keeps compression-compatible asset routing separate from the canonical page route', () => {
    const assets = routes.redirects.find((route) => route.source === '/videos/assets/:path*' && route.has)
    expect(assets.destination).toBe('https://staging-zentube.buddhachat.online/assets/:path*')
    expect(routes.redirects.some((route) => route.source === '/videos/:path*')).toBe(false)
  })
  it('uses explicit staging origins for candidate auth and video requests', () => {
    const hostMatches = (route) => route.has?.some((condition) => condition.type === 'host' && new RegExp(`^${condition.value}$`).test('staging.buddhachat.online'))
    const auth = routes.rewrites.find((route) => route.source === '/api/auth/:path*' && hostMatches(route))
    const video = routes.rewrites.find((route) => route.source === '/videos/:path*' && hostMatches(route))
    expect(auth.destination).toBe('https://staging-zentube.buddhachat.online/api/auth/:path*')
    expect(video.destination).toContain('staging-zentube.buddhachat.online/__buddhachat_www/videos/')
    expect(auth.has.some((condition) => new RegExp(`^${condition.value}$`).test('staging.buddhachat.online.evil.test'))).toBe(false)
    expect(routes.rewrites.find((route) => route.source === '/login').destination).toBe('/spa.html')
  })
})
