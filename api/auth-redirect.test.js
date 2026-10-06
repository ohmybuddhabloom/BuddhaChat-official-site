import { describe, expect, it } from 'vitest'

import handler from './auth-redirect.js'

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) {
      this.headers[name] = value
    },
    end(payload) {
      this.body = payload
    },
  }
}

describe('api/auth-redirect', () => {
  it('redirects legacy login to the shared account page with a same-origin return URL', () => {
    const res = createResponse()

    handler(
      {
        url: '/login?returnUrl=/sutra',
        headers: {
          host: 'www.buddhachat.online',
          'x-forwarded-proto': 'https',
        },
      },
      res,
    )

    expect(res.statusCode).toBe(307)
    expect(res.headers['Cache-Control']).toBe('no-store')
    expect(res.headers.Location).toBe(
      'https://www.buddhachat.online/login?returnUrl=https%3A%2F%2Fwww.buddhachat.online%2Fsutra',
    )
  })

  it('rejects external return URLs', () => {
    const res = createResponse()

    handler(
      {
        url: '/login?returnUrl=https%3A%2F%2Fevil.example%2Fsteal',
        headers: {
          host: 'www.buddhachat.online',
          'x-forwarded-proto': 'https',
        },
      },
      res,
    )

    expect(res.headers.Location).toBe(
      'https://www.buddhachat.online/login?returnUrl=https%3A%2F%2Fwww.buddhachat.online%2F',
    )
  })

  it('keeps music and reader product returns instead of falling back to home', () => {
    for (const returnUrl of [
      'https://www.buddhachat.online/music',
      'https://www.buddhachat.online/sutra?book=sutra-t0251',
    ]) {
      const res = createResponse()
      handler(
        {
          url: `/login?returnUrl=${encodeURIComponent(returnUrl)}`,
          headers: { host: 'www.buddhachat.online' },
        },
        res,
      )
      expect(new URL(res.headers.Location).searchParams.get('returnUrl')).toBe(
        returnUrl,
      )
    }
  })

  it('keeps candidate login and its return on staging', () => {
    const res = createResponse()
    handler({ url: '/auth/login?returnUrl=/music/', headers: { host: 'staging.buddhachat.online' } }, res, { env: { VERCEL_TARGET_ENV: 'staging' } })
    const target = new URL(res.headers.Location)
    expect(target.origin).toBe('https://staging.buddhachat.online')
    expect(target.pathname).toBe('/login')
    expect(target.searchParams.get('returnUrl')).toBe('https://staging.buddhachat.online/music/')
  })

  it('rejects backslash redirects, userinfo and cross-environment return targets', () => {
    for (const returnUrl of ['/\\evil.example/path', 'https://user@www.buddhachat.online/sutra/', 'https://staging.buddhachat.online/sutra/']) {
      const res = createResponse()
      handler({ url: `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`, headers: { host: 'www.buddhachat.online', 'x-forwarded-host': 'evil.example' } }, res, { env: { VERCEL_TARGET_ENV: 'production' } })
      expect(new URL(res.headers.Location).searchParams.get('returnUrl')).toBe('https://www.buddhachat.online/')
    }
  })
})
