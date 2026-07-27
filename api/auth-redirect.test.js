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
  it('redirects to Zentube login with a same-origin absolute return URL', () => {
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
      'https://www.buddhachat.online/videos/auth/login?returnUrl=https%3A%2F%2Fwww.buddhachat.online%2Fsutra',
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
      'https://www.buddhachat.online/videos/auth/login?returnUrl=https%3A%2F%2Fwww.buddhachat.online%2F',
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
})
