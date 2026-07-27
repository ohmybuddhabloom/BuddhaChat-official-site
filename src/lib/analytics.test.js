import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  targetProductFromHref,
  trackCtaClick,
  trackNavClick,
  trackPageView,
} from './analytics.js'

describe('official analytics client', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    window.history.replaceState({}, '', '/?ch=WeChat Group 01&email=secret@example.com')
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true }),
    }))
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('posts page views with visitor and session ids but no user or input fields', () => {
    trackPageView()

    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/analytics',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
      }),
    )
    expect(body).toEqual(
      expect.objectContaining({
        eventName: 'page_view',
        channelCode: 'wechat-group-01',
        path: '/',
      }),
    )
    expect(body.visitorId).toMatch(/^visitor_/)
    expect(body.sessionId).toMatch(/^session_/)
    expect(body.userId).toBeUndefined()
    expect(body.metadata).toEqual({})
  })

  it('tracks navigation and CTA metadata without blocking callers', () => {
    trackNavClick('/videos')
    trackCtaClick('app_download_request', 'app')

    expect(JSON.parse(global.fetch.mock.calls[0][1].body).metadata).toEqual({
      placement: 'primary_nav',
      targetProduct: 'videos',
    })
    expect(JSON.parse(global.fetch.mock.calls[1][1].body).metadata).toEqual({
      placement: 'app_download_request',
      targetProduct: 'app',
    })
  })

  it('infers official for home links', () => {
    expect(targetProductFromHref('/')).toBe('official')
  })
})
