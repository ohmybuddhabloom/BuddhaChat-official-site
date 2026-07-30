import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { describe, expect, test } from 'vitest'
import {
  masterOriginForEnvironment,
  masterSlugFromHost,
  masterSlugFromPath,
  masterUpstreamHeaders,
  masterUpstreamUrl,
} from './master-router/api/index.js'

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
    expect(config.functions['api/index.js'].regions).toEqual(['sin1'])
  })

  test('derives only master slugs and preserves the incoming query', () => {
    expect(masterSlugFromHost('yuanhui.buddhachat.online')).toBe('yuanhui')
    expect(masterSlugFromHost('www.buddhachat.online')).toBeNull()
    expect(masterSlugFromHost('attacker.example')).toBeNull()
    expect(masterSlugFromPath('/yuanhui', 'preview')).toBe('yuanhui')
    expect(masterSlugFromPath('/yuanhui', 'production')).toBeNull()
    expect(masterSlugFromPath('/videos', 'preview')).toBeNull()
    expect(masterUpstreamUrl('yuanhui', '/?embedded=1&lang=zh-TW')).toBe(
      'https://zentube.buddhachat.online/__buddhachat_www/videos/topics/yuanhui?embedded=1&lang=zh-TW',
    )
    expect(masterUpstreamUrl(
      'yuanhui',
      '/?embedded=1',
      'https://zentube-staging.example',
    )).toBe(
      'https://zentube-staging.example/__buddhachat_www/videos/topics/yuanhui?embedded=1',
    )
  })

  test('requires an isolated ZenTube origin in Preview', () => {
    expect(masterOriginForEnvironment('production')).toBe(
      'https://zentube.buddhachat.online',
    )
    expect(masterOriginForEnvironment('preview')).toBeNull()
    expect(masterOriginForEnvironment(
      'preview',
      'https://zentube.buddhachat.online/',
    )).toBeNull()
    expect(masterOriginForEnvironment(
      'preview',
      'https://h5-zentube-git-staging.example',
    )).toBe('https://h5-zentube-git-staging.example')
  })

  test('passes the upstream protection bypass only in Preview', () => {
    expect(masterUpstreamHeaders('text/html', 'production', 'secret')).toEqual({
      accept: 'text/html',
    })
    expect(masterUpstreamHeaders('text/html', 'preview', 'secret')).toEqual({
      accept: 'text/html',
      'x-vercel-protection-bypass': 'secret',
    })
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
