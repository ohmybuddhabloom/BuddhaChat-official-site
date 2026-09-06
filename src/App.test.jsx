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
  default: ({ locale = 'zh' }) => (
    <div data-testid="app-download-page" data-locale={locale} />
  ),
}))

vi.mock('./pages/YuanhuiUserGuidePage.jsx', () => ({
  default: () => <div data-testid="yuanhui-user-guide-page" />,
}))

vi.mock('./pages/AppFaqGuidePage.jsx', () => ({
  default: () => <div data-testid="app-faq-guide-page" />,
}))

vi.mock('./pages/AppOnboardingWelcomePage.jsx', () => ({
  default: () => <div data-testid="app-onboarding-welcome-page" />,
}))

describe('App routing', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    window.history.pushState({}, '', '/')
  })

  it('keeps the official landing page on the home route', async () => {
    window.history.pushState({}, '', '/')

    render(<App />)

    expect(await screen.findByTestId('landing-page')).toBeInTheDocument()
  })

  it('falls back to the official landing page for an unknown story', async () => {
    window.history.pushState({}, '', '/?story=missing-story')

    render(<App />)

    expect(await screen.findByTestId('landing-page')).toBeInTheDocument()
  })

  it('renders fusion shell routes under www without replacing old subdomains', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('blocked')))
    window.history.pushState({}, '', '/sutra')

    render(<App />)

    expect(await screen.findByRole('link', { name: 'Open existing reader' })).toHaveAttribute(
      'href',
      'https://www.buddhachat.online/sutra',
    )
  })

  it('keeps /zentube as a compatibility entry to the video site', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('blocked')))
    window.history.pushState({}, '', '/zentube')

    render(<App />)

    expect(await screen.findByRole('link', { name: 'Open existing video site' })).toHaveAttribute(
      'href',
      'https://www.buddhachat.online/videos',
    )
  })

  it('supports /login as the product login path', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('blocked')))
    window.history.pushState({}, '', '/login')

    render(<App />)

    expect(await screen.findByTestId('account-login')).toBeInTheDocument()
    expect(screen.getByTestId('account-email')).toHaveAttribute('type', 'email')
    expect(screen.getByTestId('account-submit')).toBeInTheDocument()
  })

  it('renders the public app download route without a channel code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    window.history.pushState({}, '', '/download')

    render(<App />)

    expect(await screen.findByTestId('app-download-page')).toBeInTheDocument()
  })

  it('keeps the old campaign download route as a compatibility alias', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    window.history.pushState({}, '', '/download/yuanhui?ch=yuanhui-poster-01')

    render(<App />)

    expect(await screen.findByTestId('app-download-page')).toBeInTheDocument()
  })

  it('renders the standalone English download route without the Chinese toggle', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    window.history.pushState({}, '', '/download/en')

    render(<App />)

    expect(await screen.findByTestId('app-download-page')).toHaveAttribute(
      'data-locale',
      'en',
    )
    expect(
      screen.queryByRole('navigation', { name: '简体繁体切换' }),
    ).not.toBeInTheDocument()
  })

  it('renders the source teacher mobile user guide', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    window.history.pushState({}, '', '/guide/yuanhui')

    render(<App />)

    expect(await screen.findByTestId('yuanhui-user-guide-page')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '简体繁体切换' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '繁' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders the standalone app highlights and faq guide', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    window.history.pushState({}, '', '/guide/app-faq')

    render(<App />)

    expect(await screen.findByTestId('app-faq-guide-page')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '简体繁体切换' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '繁' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders the H5 app onboarding welcome route', async () => {
    window.history.pushState({}, '', '/app/onboarding/v1')

    render(<App />)

    expect(await screen.findByTestId('app-onboarding-welcome-page')).toBeInTheDocument()
  })
})
