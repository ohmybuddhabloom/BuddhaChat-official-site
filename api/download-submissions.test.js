import { EventEmitter } from 'node:events'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./_lib/supabase.js', () => ({
  insertDownloadSubmission: vi.fn(),
  normalizeEmail: vi.fn((email) => email.trim().toLowerCase()),
  upsertContact: vi.fn(),
  hashIpAddress: vi.fn(() => 'hashed-ip'),
}))

vi.mock('./_lib/env.js', () => ({
  getOptionalEnv: vi.fn(() => null),
}))

vi.mock('./_lib/rate-limit.js', () => ({
  consumeRateLimit: vi.fn(() => ({
    ok: true,
    remaining: 4,
    resetAt: Date.now() + 1000,
  })),
}))

import handler from './download-submissions.js'
import { getOptionalEnv } from './_lib/env.js'
import {
  insertDownloadSubmission,
  upsertContact,
} from './_lib/supabase.js'

function createRequest({
  method = 'POST',
  body = {},
  headers = {},
} = {}) {
  const req = new EventEmitter()
  req.method = method
  req.headers = headers
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

describe('api/download-submissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    upsertContact.mockResolvedValue({ id: 'contact_123' })
    insertDownloadSubmission.mockResolvedValue({ id: 'submission_456' })
    getOptionalEnv.mockReturnValue(null)
  })

  it('inserts a valid submission and returns success', async () => {
    const req = createRequest({
      body: {
        email: 'hello@example.com',
        ctaVariant: 'primary-download',
        pagePath: '/?story=quiet-dialogue',
      },
      headers: {
        'user-agent': 'Vitest Browser',
        'x-forwarded-for': '127.0.0.1',
      },
    })
    const res = createResponse()

    await handler(req, res)

    expect(upsertContact).toHaveBeenCalledWith('hello@example.com')
    expect(insertDownloadSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        contact_id: 'contact_123',
        cta_variant: 'primary-download',
        page_path: '/?story=quiet-dialogue',
      }),
    )
    expect(res.statusCode).toBe(200)
    expect(readJson(res)).toEqual(
      expect.objectContaining({
        ok: true,
        contactId: 'contact_123',
        submissionId: 'submission_456',
      }),
    )
  })

  it('rejects invalid email addresses with 400', async () => {
    const req = createRequest({
      body: {
        email: 'bad-email',
      },
    })
    const res = createResponse()

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(readJson(res)).toEqual({
      ok: false,
      error: 'A valid email address is required.',
    })
    expect(upsertContact).not.toHaveBeenCalled()
  })

  it('returns a stable configuration error when env is missing', async () => {
    upsertContact.mockRejectedValueOnce(
      new Error('Missing required environment variable: SUPABASE_URL'),
    )

    const req = createRequest({
      body: {
        email: 'hello@example.com',
      },
    })
    const res = createResponse()

    await handler(req, res)

    expect(res.statusCode).toBe(500)
    expect(readJson(res)).toEqual({
      ok: false,
      error: 'Download submissions are not configured yet.',
      details: 'Missing required environment variable: SUPABASE_URL',
    })
  })
})
