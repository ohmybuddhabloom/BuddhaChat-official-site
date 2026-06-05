import { describe, expect, it, vi } from 'vitest'
import { buildAuthReturnUrl, fetchZentubeSession } from './fusionAuth.js'

describe('fusion auth helpers', () => {
  it('checks Zentube session with credentials included', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, user: { id: 7, displayName: 'Kevin' } }),
    })

    const session = await fetchZentubeSession({
      fetchImpl,
      origin: 'https://zentube.buddhachat.online/',
    })

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://zentube.buddhachat.online/api/auth/user',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(session).toEqual({
      status: 'authenticated',
      authenticated: true,
      reason: '',
      user: { id: 7, displayName: 'Kevin' },
    })
  })

  it('treats blocked session bridge requests as unavailable', async () => {
    const session = await fetchZentubeSession({
      fetchImpl: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    })

    expect(session.status).toBe('unavailable')
    expect(session.authenticated).toBe(false)
  })

  it('builds a same-origin absolute return URL for Zentube login', () => {
    expect(buildAuthReturnUrl('/sutra', 'https://www.buddhachat.online')).toBe(
      'https://www.buddhachat.online/sutra',
    )
    expect(buildAuthReturnUrl('https://evil.example/sutra', 'https://www.buddhachat.online')).toBe(
      'https://www.buddhachat.online/',
    )
  })
})
