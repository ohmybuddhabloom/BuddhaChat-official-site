import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  SiteApiError,
  createDonationIntent,
  getCurrentPagePath,
  getSiteSessionId,
  submitChatPrompt,
  submitDownloadLead,
} from './siteApi.js'

describe('siteApi', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    window.history.replaceState({}, '', '/?story=quiet-dialogue')
    vi.restoreAllMocks()
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    }))
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('reuses a stable site session id for chat submissions', () => {
    const first = getSiteSessionId()
    const second = getSiteSessionId()

    expect(first).toBe(second)
  })

  it('uses the current path and session when posting chat prompts', async () => {
    await submitChatPrompt({ message: 'Walk gently.' })

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/chat-prompts',
      expect.objectContaining({
        method: 'POST',
      }),
    )

    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.message).toBe('Walk gently.')
    expect(body.pagePath).toBe(getCurrentPagePath())
    expect(typeof body.sessionId).toBe('string')
  })

  it('posts download leads to the expected endpoint', async () => {
    await submitDownloadLead({ email: 'hello@example.com' })

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/download-submissions',
      expect.objectContaining({
        method: 'POST',
      }),
    )
  })

  it('posts donation intents to the expected endpoint', async () => {
    await createDonationIntent({
      email: 'donor@example.com',
      selectedTierId: 'open-a-gate',
    })

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/donation-intents',
      expect.objectContaining({
        method: 'POST',
      }),
    )
  })

  it('throws a SiteApiError for failed requests', async () => {
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({
        ok: false,
        error: 'Bad request',
        details: 'Invalid email',
      }),
    }))

    await expect(
      submitDownloadLead({ email: 'bad-email' }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: SiteApiError.name,
        message: 'Bad request',
        status: 400,
        details: 'Invalid email',
      }),
    )
  })

  it('surfaces stable configuration errors from the endpoint contract', async () => {
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({
        ok: false,
        error: 'Download submissions are not configured yet.',
        details: 'Missing required environment variable: SUPABASE_URL',
      }),
    }))

    await expect(
      submitDownloadLead({ email: 'hello@example.com' }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: SiteApiError.name,
        message: 'Download submissions are not configured yet.',
        status: 500,
        details: 'Missing required environment variable: SUPABASE_URL',
      }),
    )
  })
})
