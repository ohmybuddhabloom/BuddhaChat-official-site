import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SunyataVisual from './SunyataVisual.jsx'
import { createSceneSnapshot } from '../../content/sunyata.js'

vi.mock('../../lib/journalAssetStore.js', () => ({
  resolveJournalImageSource: vi.fn(async (source) => ({
    src: source,
    revoke() {},
  })),
}))

describe('SunyataVisual', () => {
  it('renders the quote content as an overlay inside the visual anchor', () => {
    const scene = createSceneSnapshot()
    scene.quote.x = 48
    scene.quote.y = -24

    const { container } = render(
      <SunyataVisual
        sectionRef={null}
        ghostLabelRef={null}
        visual={scene.visual}
        quote={scene.quote}
      />,
    )

    expect(
      screen.getByRole('img', { name: scene.visual.imageAlt }),
    ).toBeInTheDocument()

    const quoteOverlay = screen.getByTestId('visual-quote-overlay')
    expect(screen.getByText(scene.quote.text)).toBeInTheDocument()
    expect(screen.getByText(scene.quote.studioLabel)).toBeInTheDocument()
    expect(screen.getByText(scene.quote.philosophyLabel)).toBeInTheDocument()
    expect(quoteOverlay).toHaveStyle({
      transform: 'translate3d(48px, -24px, 0px)',
      maxWidth: `${scene.quote.maxWidth}px`,
    })
    expect(quoteOverlay.closest('.visual-anchor')).not.toBeNull()
    expect(container.querySelector('.visual-quote-wrap')).toBe(quoteOverlay)
  })
})
