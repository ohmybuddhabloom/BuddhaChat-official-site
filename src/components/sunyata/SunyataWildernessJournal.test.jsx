import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SunyataWildernessJournal from './SunyataWildernessJournal.jsx'
import { createSceneSnapshot } from '../../content/sunyata.js'

vi.mock('../../lib/journalAssetStore.js', () => ({
  resolveJournalImageSource: vi.fn(async (source) => ({
    src: source,
    revoke() {},
  })),
}))

describe('SunyataWildernessJournal', () => {
  it('does not render the request access form anymore', () => {
    const scene = createSceneSnapshot()

    render(<SunyataWildernessJournal journal={scene.journal} />)

    expect(screen.queryByText('Request Access')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('applies the journal background color and opacity variables', () => {
    const scene = createSceneSnapshot()
    scene.journal.theme.base = '#123456'
    scene.journal.theme.overlayColor = '#456789'
    scene.journal.theme.overlayOpacity = 54
    scene.journal.theme.imageOpacity = 41
    scene.journal.theme.leftVeilOpacity = 88
    scene.journal.theme.bottomVeilOpacity = 67
    scene.journal.theme.ambientGlowOpacity = 22
    scene.journal.theme.copyMaxWidth = 612
    scene.journal.theme.cardWidth = 368
    scene.journal.theme.cardHeight = 492

    render(<SunyataWildernessJournal journal={scene.journal} />)

    expect(screen.getByTestId('wilderness-journal-section')).toHaveStyle({
      '--journal-bg': '#123456',
      '--journal-overlay-color': '#456789',
      '--journal-overlay-opacity': '0.54',
      '--journal-image-opacity': '0.41',
      '--journal-left-veil-opacity': '0.88',
      '--journal-bottom-veil-opacity': '0.67',
      '--journal-glow-opacity': '0.22',
      '--journal-copy-max-width': '612px',
      '--journal-card-width': '368px',
      '--journal-card-height': '492px',
    })
  })
})
