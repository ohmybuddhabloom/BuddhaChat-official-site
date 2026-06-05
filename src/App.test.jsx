import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

vi.mock('./pages/SunyataLanding.jsx', () => ({
  default: () => <div data-testid="landing-page" />,
}))

vi.mock('./pages/StoryPage.jsx', () => ({
  default: () => <div data-testid="story-page" />,
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

    expect(screen.getByRole('link', { name: 'Open current reader' })).toHaveAttribute(
      'href',
      'https://sutra.buddhachat.online',
    )
  })

  it('keeps /zentube as a compatibility entry to the video site', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('blocked')))
    window.history.pushState({}, '', '/zentube')

    render(<App />)

    expect(screen.getByRole('link', { name: 'Open current video site' })).toHaveAttribute(
      'href',
      'https://zentube.buddhachat.online',
    )
  })
})
