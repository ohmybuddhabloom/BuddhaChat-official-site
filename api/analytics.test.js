import { EventEmitter } from 'node:events'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./_lib/supabase.js', () => ({
  insertAnalyticsEvent: vi.fn(),
}))

import handler from './analytics.js'
import { insertAnalyticsEvent } from './_lib/supabase.js'

function createRequest({ method = 'POST', body = {} } = {}) {
  const req = new EventEmitter()
  req.method = method
  req.headers = {}
  req.body = body
  return req
}

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

function readJson(res) {
  return JSON.parse(res.body)
}

describe('api/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    insertAnalyticsEvent.mockResolvedValue(undefined)
  })

  it('cleans official events and never trusts client user ids', async () => {
    const req = createRequest({
      body: {
        eventName: 'CTA Click!',
        visitorId: 'visitor 123',
        sessionId: 'session 456',
        userId: 'user-from-client',
        channelCode: 'WeChat Group 01',
        path: '/?story=a-life-in-thangka&email=secret@example.com&ch=bad',
        referrer: 'https://example.com/path?token=secret',
        userAgent: 'Vitest Browser',
        metadata: {
          placement: 'app_download_request',
          targetProduct: 'app',
          queryLength: 12.8,
          email: 'secret@example.com',
        },
      },
    })
    const res = createResponse()

    await handler(req, res)

    expect(insertAnalyticsEvent).toHaveBeenCalledWith({
      product: 'official',
      event_name: 'cta_click',
      visitor_id: 'visitor_123',
      session_id: 'session_456',
      channel_code: 'wechat-group-01',
      path: '/?story=a-life-in-thangka',
      referrer: 'https://example.com/path',
      user_agent: 'Vitest Browser',
      metadata: {
        placement: 'app_download_request',
        targetProduct: 'app',
        queryLength: 12,
      },
    })
    expect(readJson(res)).toEqual({ ok: true })
  })

  it('rejects unsupported event names', async () => {
    const req = createRequest({
      body: {
        eventName: 'input_change',
        visitorId: 'visitor_123',
      },
    })
    const res = createResponse()

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(insertAnalyticsEvent).not.toHaveBeenCalled()
  })
})
