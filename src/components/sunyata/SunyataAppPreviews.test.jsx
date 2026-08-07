import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import SunyataAppPreviews from './SunyataAppPreviews.jsx'
import { createSceneSnapshot } from '../../content/sunyata.js'
import { trackCtaClick } from '../../lib/analytics.js'

vi.mock('../../lib/analytics.js', () => ({
  trackCtaClick: vi.fn(),
}))

describe('SunyataAppPreviews', () => {
  it('routes the primary CTA to the download page', () => {
    const scene = createSceneSnapshot()

    render(<SunyataAppPreviews showcase={scene.appShowcase} />)

    const primary = screen.getByRole('link', {
      name: scene.appShowcase.primaryActionLabel,
    })
    expect(primary).toHaveAttribute('href', '/download')
  })

  it('tracks the primary CTA open event', () => {
    const scene = createSceneSnapshot()

    render(<SunyataAppPreviews showcase={scene.appShowcase} />)

    fireEvent.click(
      screen.getByRole('link', { name: scene.appShowcase.primaryActionLabel }),
    )

    expect(trackCtaClick).toHaveBeenCalledWith('app_download_open', 'app')
  })
})
