import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    expect(screen.getByRole('link', { name: 'Open existing video site' })).toHaveAttribute(
      'href',
      'https://zentube.buddhachat.online',
    )
    expect(screen.getByText(/Existing video and sutra subdomains remain untouched/i)).toBeInTheDocument()
  })

  it('renders the same-origin login form instead of a cross-subdomain handoff', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('blocked')))
    window.history.pushState({}, '', '/auth/login?returnUrl=/sutra')

    render(<FusionRoutePage routePath="/auth/login" />)

    expect(screen.getByRole('form', { name: 'Email code sign in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send code' })).toBeInTheDocument()
  })

  it('submits the same-origin email code login flow', async () => {
    const fetch = vi.fn(async (path) => ({
      ok: true,
      json: async () =>
        String(path).includes('login-with-code')
          ? { success: true, data: { user: { email: 'kevin@example.com' } } }
          : { success: true },
    }))
    vi.stubGlobal('fetch', fetch)
    const assign = vi.fn()
    window.history.pushState({}, '', '/auth/login?returnUrl=/sutra')

    render(<FusionRoutePage navigate={assign} routePath="/auth/login" />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'kevin@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Verification code')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Verification code'), {
      target: { value: '123456' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith('http://localhost:3000/sutra')
    })
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/send-login-code',
      expect.objectContaining({ credentials: 'include', method: 'POST' }),
    )
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/login-with-code',
      expect.objectContaining({ credentials: 'include', method: 'POST' }),
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
