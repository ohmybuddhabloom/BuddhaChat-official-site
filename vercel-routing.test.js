import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { describe, expect, test } from 'vitest'

describe('website product routing', () => {
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

  test('keeps music under the website music path through the Vercel music app', async () => {
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
