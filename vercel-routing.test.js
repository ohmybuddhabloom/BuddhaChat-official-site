import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { describe, expect, test, vi } from 'vitest'
import routerHandler from './master-router/api/index.js'
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

    expect(config.redirects.some(({ source }) => source === '/music')).toBe(false)
    expect(config.rewrites).toEqual(expect.arrayContaining([
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
  })
})

describe('account API forwards', () => {
  test('sends versioned reader sync and music state to the video site before the page fallback', async () => {
    const config = JSON.parse(await readFile(path.join(process.cwd(), 'vercel.json'), 'utf8'))
    const index = source => config.rewrites.findIndex(rule => rule.source === source && !rule.has)
    for (const [source, destination] of [
      ['/api/reader-sync/:path*', 'https://zentube.buddhachat.online/api/reader-sync/:path*'],
      ['/api/music/:path*', 'https://zentube.buddhachat.online/api/music/:path*'],
    ]) {
      expect(index(source)).toBeGreaterThanOrEqual(0)
      expect(config.rewrites[index(source)].destination).toBe(destination)
      expect(index(source)).toBeLessThan(index('/:path*/'))
    }
  })
})

describe('App 1.3.7 music page', () => {
  test('routes the versioned native music path, including its trailing slash, to the music project before any catch-all', async () => {
    const config = JSON.parse(await readFile(path.join(process.cwd(), 'vercel.json'), 'utf8'))
    const sources = config.rewrites.map((rule) => rule.source)
    const root = config.rewrites.find((rule) => rule.source === '/music/app137-owner-v2-01dafd9/')

    expect(root).toEqual({
      source: '/music/app137-owner-v2-01dafd9/',
      destination: 'https://buddhachat-music.vercel.app/music/app137-owner-v2-01dafd9/',
    })
    expect(root.has).toBeUndefined()
    expect(sources.indexOf('/music/app137-owner-v2-01dafd9/')).toBeLessThan(sources.indexOf('/music/:path*'))
    expect(sources.indexOf('/music/app137-owner-v2-01dafd9/')).toBeLessThan(sources.indexOf('/:path*'))
  })
})

describe('go smart link proxy', () => {
  test('hands a smart link redirect to the visitor instead of following it', async () => {
    const location = 'https://www.buddhachat.online/download?ch=video-share'
    const fetchMock = vi.fn(async () => new Response(null, { status: 302, headers: { location, 'cache-control': 'no-store' } }))
    vi.stubGlobal('fetch', fetchMock)
    const headers = {}
    const response = {
      statusCode: 0,
      sent: undefined,
      setHeader(key, value) { headers[key] = value },
      status(code) { this.statusCode = code; return this },
      send(body) { this.sent = body; return this },
    }
    try {
      await routerHandler({
        method: 'GET',
        url: '/l/video?itemId=topic%3A19',
        headers: { host: 'go.buddhachat.online', 'user-agent': 'iPhone' },
      }, response)
    } finally {
      vi.unstubAllGlobals()
    }
    expect(fetchMock.mock.calls[0][1].redirect).toBe('manual')
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/l\/video\?itemId=topic%3A19$/)
    expect(response.statusCode).toBe(302)
    expect(headers.location).toBe(location)
  })
})
