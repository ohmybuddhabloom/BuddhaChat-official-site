import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FusionRoutePage from './FusionRoutePage.jsx'

describe('FusionRoutePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    window.history.pushState({}, '', '/')
  })

  it('renders a safe video entry that links to the current Zentube site', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('blocked')))

    render(<FusionRoutePage routePath="/videos" />)

    expect(
      screen.getByRole('heading', {
        name: /Master talks stay online while www becomes the front door/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open current video site' })).toHaveAttribute(
      'href',
      'https://zentube.buddhachat.online',
    )
    expect(screen.getByText(/Existing video and sutra subdomains remain untouched/i)).toBeInTheDocument()
  })

  it('passes the absolute www returnUrl through to the Zentube login handoff', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('blocked')))
    window.history.pushState({}, '', '/auth/login?returnUrl=/sutra')

    render(<FusionRoutePage routePath="/auth/login" />)

    expect(screen.getByRole('link', { name: 'Continue to Zentube login' })).toHaveAttribute(
      'href',
      'https://zentube.buddhachat.online/auth/login?returnUrl=http%3A%2F%2Flocalhost%3A3000%2Fsutra',
    )
  })

  it('uses the configured Zentube origin for preview handoff checks', () => {
    vi.stubEnv('VITE_ZENTUBE_ORIGIN', 'https://h5-zentube-preview.example')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('blocked')))
    window.history.pushState({}, '', '/auth/login?returnUrl=/sutra')

    render(<FusionRoutePage routePath="/auth/login" />)

    expect(screen.getByRole('link', { name: 'Continue to Zentube login' })).toHaveAttribute(
      'href',
      'https://h5-zentube-preview.example/auth/login?returnUrl=http%3A%2F%2Flocalhost%3A3000%2Fsutra',
    )
  })

  it('uses the configured Sutra origin for preview reader links', () => {
    vi.stubEnv('VITE_SUTRA_ORIGIN', 'https://sutra-preview.example/')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('blocked')))

    render(<FusionRoutePage routePath="/sutra" />)

    expect(screen.getByRole('link', { name: 'Open current reader' })).toHaveAttribute(
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
    expect(screen.getByText('Kevin')).toBeInTheDocument()
  })
})
