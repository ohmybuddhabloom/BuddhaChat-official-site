import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

vi.mock('./pages/SunyataLanding.jsx', () => ({
  default: () => <div data-testid="landing-page" />,
}))

vi.mock('./pages/StoryPage.jsx', () => ({
  default: () => <div data-testid="story-page" />,
}))

vi.mock('./pages/AppDownloadPage.jsx', () => ({
  default: () => <div data-testid="app-download-page" />,
}))

describe('App routing', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    window.history.pushState({}, '', '/')
  })

  it('keeps the official landing page on the home route', () => {
    window.history.pushState({}, '', '/')

    render(<App />)

    expect(screen.getByTestId('landing-page')).toBeInTheDocument()
  })

  it('renders fusion shell routes under www without replacing old subdomains', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('blocked')))
    window.history.pushState({}, '', '/sutra')

    render(<App />)

    expect(screen.getByRole('link', { name: 'Open existing reader' })).toHaveAttribute(
      'href',
      'https://sutra.buddhachat.online',
    )
  })

  it('keeps /zentube as a compatibility entry to the video site', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('blocked')))
    window.history.pushState({}, '', '/zentube')

    render(<App />)

    expect(screen.getByRole('link', { name: 'Open existing video site' })).toHaveAttribute(
      'href',
      'https://zentube.buddhachat.online',
    )
  })

  it('supports /login as the product login path', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('blocked')))
    window.history.pushState({}, '', '/login')

    render(<App />)

    expect(screen.getByRole('link', { name: 'Continue to Zentube login' })).toHaveAttribute(
      'href',
      'https://zentube.buddhachat.online/auth/login?returnUrl=http%3A%2F%2Flocalhost%3A3000%2F',
    )
  })

  it('renders the public app download route without a channel code', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    window.history.pushState({}, '', '/download')

    render(<App />)

    expect(screen.getByTestId('app-download-page')).toBeInTheDocument()
  })

  it('keeps the old campaign download route as a compatibility alias', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    window.history.pushState({}, '', '/download/yuanhui?ch=yuanhui-poster-01')

    render(<App />)

    expect(screen.getByTestId('app-download-page')).toBeInTheDocument()
  })
})
