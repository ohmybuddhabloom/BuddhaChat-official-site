import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { describe, expect, test } from 'vitest'
import routing from './master-router/lib/routing.js'

const {
  masterSlugFromHost,
  masterUpstreamUrl,
} = routing

describe('website product routing', () => {
  test('redirects master entry points to their public subdomain', async () => {
    const config = JSON.parse(await readFile(path.join(process.cwd(), 'vercel.json'), 'utf8'))

    expect(config.redirects).toEqual(expect.arrayContaining([
      {
        source: '/master/:slug([a-z0-9-]+)',
        destination: 'https://:slug.buddhachat.online',
        permanent: true,
      },
      {
        source: '/yuanhui',
        destination: 'https://yuanhui.buddhachat.online',
        permanent: true,
      },
    ]))
  })

  test('serves every download entry through the social-card endpoint', async () => {
    const config = JSON.parse(await readFile(path.join(process.cwd(), 'vercel.json'), 'utf8'))

    expect(config.rewrites).toEqual(expect.arrayContaining([
      {
        source: '/download',
        destination: '/api/page-entry?page=download',
      },
      {
        source: '/download/',
        destination: '/api/page-entry?page=download',
      },
      {
        source: '/download/yuanhui',
        destination: '/api/page-entry?page=download',
      },
    ]))
  })

  test('routes APK downloads through the environment-controlled API', async () => {
    const config = JSON.parse(await readFile(path.join(process.cwd(), 'vercel.json'), 'utf8'))

    expect(config.redirects.some(({ destination }) => /music\.buddhachat\.online/.test(destination))).toBe(false)
    expect(config.rewrites).toEqual(expect.arrayContaining([
      {
        source: '/download/android/latest.apk',
        destination: '/api/android-apk',
      },
      {
        source: '/downloads/android/latest.apk',
        destination: '/api/android-apk',
      },
    ]))
  })

  test('serves the Yuanhui guide through the social-card endpoint', async () => {
    const config = JSON.parse(await readFile(path.join(process.cwd(), 'vercel.json'), 'utf8'))

    expect(config.rewrites).toEqual(expect.arrayContaining([
      {
        source: '/guide/yuanhui',
        destination: '/api/page-entry?page=guide-yuanhui',
      },
      {
        source: '/guide/yuanhui/',
        destination: '/api/page-entry?page=guide-yuanhui',
      },
    ]))
  })

  test('serves future website routes through the default social-card endpoint', async () => {
    const config = JSON.parse(await readFile(path.join(process.cwd(), 'vercel.json'), 'utf8'))
    const catchAllRewrites = config.rewrites.slice(-2)

    expect(catchAllRewrites).toEqual([
      {
        source: '/:path*/',
        destination: '/api/page-entry?path=:path*',
      },
      {
        source: '/:path*',
        destination: '/api/page-entry?path=:path*',
      },
    ])
  })

  test('routes a master subdomain through the dedicated edge project', async () => {
    const config = JSON.parse(
      await readFile(
        path.join(process.cwd(), 'master-router/vercel.json'),
        'utf8',
      ),
    )

    expect(config.rewrites).toEqual(expect.arrayContaining([
      {
        source: '/',
        destination: '/api',
      },
      {
        source: '/videos/:path*',
        destination: 'https://zentube.buddhachat.online/__buddhachat_www/videos/:path*',
      },
    ]))
  })

  test('derives only master slugs and preserves the incoming query', () => {
    expect(masterSlugFromHost('yuanhui.buddhachat.online')).toBe('yuanhui')
    expect(masterSlugFromHost('www.buddhachat.online')).toBeNull()
    expect(masterSlugFromHost('attacker.example')).toBeNull()
    expect(masterUpstreamUrl('yuanhui', '/?embedded=1&lang=zh-TW')).toBe(
      'https://zentube.buddhachat.online/__buddhachat_www/videos/topics/yuanhui?embedded=1&lang=zh-TW',
    )
  })

  test('keeps video under the website videos path', async () => {
    const config = JSON.parse(await readFile(path.join(process.cwd(), 'vercel.json'), 'utf8'))

    expect(config.redirects.some(({ source }) => source === '/videos')).toBe(false)
    expect(config.rewrites).toEqual(expect.arrayContaining([
      {
        source: '/videos',
        destination: 'https://zentube.buddhachat.online/__buddhachat_www/videos/',
      },
      {
        source: '/videos/',
        destination: 'https://zentube.buddhachat.online/__buddhachat_www/videos/',
      },
      {
        source: '/videos/assets/:path*',
        destination: 'https://zentube.buddhachat.online/assets/:path*',
      },
      {
        source: '/videos/locales/:path*',
        destination: 'https://zentube.buddhachat.online/locales/:path*',
      },
      {
        source: '/videos/:path*',
        destination: 'https://zentube.buddhachat.online/__buddhachat_www/videos/:path*',
      },
    ]))
  })

  test('keeps the reader under the website sutra path', async () => {
    const config = JSON.parse(await readFile(path.join(process.cwd(), 'vercel.json'), 'utf8'))

    expect(config.redirects.some(({ source }) => source === '/sutra')).toBe(false)
    expect(config.rewrites).toEqual(expect.arrayContaining([
      {
        source: '/sutra',
        destination: 'https://sutra.buddhachat.online/sutra/',
      },
      {
        source: '/sutra/',
        destination: 'https://sutra.buddhachat.online/sutra/',
      },
      {
        source: '/sutra/:path*',
        destination: 'https://sutra.buddhachat.online/sutra/:path*',
      },
    ]))
  })

  test('keeps music under the website music path', async () => {
    const config = JSON.parse(await readFile(path.join(process.cwd(), 'vercel.json'), 'utf8'))
    const stagingHost = '(?:staging\\.buddhachat\\.online|buddha-chat-official-site-env-staging-chenjunyu-1990s-projects\\.vercel\\.app)'
    const legacyPinnedOrigin = 'https://buddhachat-music-7art93p7l-chenjunyu-1990s-projects.vercel.app'
    const rewriteFor = (host, pathname) => config.rewrites.find((rewrite) => {
      const hostCondition = rewrite.has?.find(({ type }) => type === 'host')
      if (hostCondition && !new RegExp(`^(?:${hostCondition.value})$`).test(host)) {
        return false
      }
      if (rewrite.source.endsWith('/:path*')) {
        const prefix = rewrite.source.slice(0, -'/:path*'.length)
        return pathname.startsWith(`${prefix}/`)
      }
      return rewrite.source === pathname
    })
    const destinationFor = (host, pathname) => {
      const rewrite = rewriteFor(host, pathname)
      if (!rewrite) return null
      if (!rewrite.source.endsWith('/:path*')) return rewrite.destination

      const prefix = rewrite.source.slice(0, -'/:path*'.length)
      const pathRemainder = pathname.slice(prefix.length + 1)
      return rewrite.destination.replace(':path*', pathRemainder)
    }

    expect(config.redirects.some(({ source }) => source === '/music')).toBe(false)
    expect(config.rewrites).toEqual(expect.arrayContaining([
      {
        source: '/music',
        has: [{ type: 'host', value: stagingHost }],
        destination: `${legacyPinnedOrigin}/music/`,
      },
      {
        source: '/music/',
        has: [{ type: 'host', value: stagingHost }],
        destination: `${legacyPinnedOrigin}/music/`,
      },
      {
        source: '/music/:path*',
        has: [{ type: 'host', value: stagingHost }],
        destination: `${legacyPinnedOrigin}/music/:path*`,
      },
      {
        source: '/music',
        destination: 'https://buddhachat-music.vercel.app/music/',
      },
      {
        source: '/music/',
        destination: 'https://buddhachat-music.vercel.app/music/',
      },
      {
        source: '/music/:path*',
        destination: 'https://buddhachat-music.vercel.app/music/:path*',
      },
    ]))

    for (const host of [
      'staging.buddhachat.online',
      'buddha-chat-official-site-env-staging-chenjunyu-1990s-projects.vercel.app',
    ]) {
      expect(destinationFor(host, '/music')).toBe(`${legacyPinnedOrigin}/music/`)
      expect(destinationFor(host, '/music/')).toBe(`${legacyPinnedOrigin}/music/`)
      expect(destinationFor(host, '/music/assets/index.js')).toBe(`${legacyPinnedOrigin}/music/assets/index.js`)
      expect(destinationFor(host, '/music/scene/daily')).toBe(`${legacyPinnedOrigin}/music/scene/daily`)
    }

    expect(destinationFor('www.buddhachat.online', '/music')).toBe('https://buddhachat-music.vercel.app/music/')
    expect(destinationFor('www.buddhachat.online', '/music/assets/index.js')).toBe('https://buddhachat-music.vercel.app/music/assets/index.js')
    expect(destinationFor('www.buddhachat.online', '/')).toBe('/api/page-entry?page=home')
    expect(destinationFor('www.buddhachat.online', '/api/music/state')).toBe('https://zentube.buddhachat.online/api/music/state')
  })
})
