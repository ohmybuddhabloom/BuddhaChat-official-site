import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FusionRoutePage from './FusionRoutePage.jsx'

describe('FusionRoutePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    window.history.pushState({}, '', '/')
  })

  it('redirects the video entry to the existing Zentube site', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('blocked')))

    render(<FusionRoutePage routePath="/videos" />)

    expect(
      screen.getByRole('heading', {
        name: /Master talks stay online while www becomes the front door/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open existing video site' })).toHaveAttribute(
      'href',
      'https://zentube.buddhachat.online',
    )
    expect(document.querySelector('meta[http-equiv="refresh"]')).toHaveAttribute(
      'content',
      '0; url=https://zentube.buddhachat.online',
    )
  })

  it('redirects login to the reused Zentube login with a safe return URL', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('blocked')))
    window.history.pushState({}, '', '/auth/login?returnUrl=/sutra')

    render(<FusionRoutePage routePath="/auth/login" />)

    expect(screen.getByRole('link', { name: 'Continue to Zentube login' })).toHaveAttribute(
      'href',
      'https://zentube.buddhachat.online/auth/login?returnUrl=http%3A%2F%2Flocalhost%3A3000%2Fsutra',
    )
  })

  it('uses the configured Sutra origin for preview reader links', () => {
    vi.stubEnv('VITE_SUTRA_ORIGIN', 'https://sutra-preview.example/')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('blocked')))

    render(<FusionRoutePage routePath="/sutra" />)

    expect(screen.getByRole('link', { name: 'Open existing reader' })).toHaveAttribute(
      'href',
      'https://sutra-preview.example',
    )
  })

  it('shows shared login status when the Zentube bridge is visible', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, user: { displayName: 'Kevin' } }),
      }),
    )

    render(<FusionRoutePage routePath="/me" />)

    await waitFor(() => {
      expect(screen.getByText('Signed in')).toBeInTheDocument()
    })
    expect(screen.getAllByText('Kevin').length).toBeGreaterThan(0)
  })

  it('shows account details and same-origin logout on /me', async () => {
    const fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, user: { displayName: 'Kevin', email: 'kevin@example.com' } }),
    }))
    vi.stubGlobal('fetch', fetch)

    render(<FusionRoutePage routePath="/me" />)

    await waitFor(() => {
      expect(screen.getByText('kevin@example.com')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })
})
