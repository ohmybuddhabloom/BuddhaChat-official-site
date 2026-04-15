import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SunyataWildernessJournal from './SunyataWildernessJournal.jsx'
import { createSceneSnapshot } from '../../content/sunyata.js'

vi.mock('../../lib/journalAssetStore.js', () => ({
  resolveJournalImageSource: vi.fn(async (source) => ({
    src: source,
    revoke() {},
  })),
}))

describe('SunyataWildernessJournal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

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
    scene.journal.theme.leadBrightness = 118
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
      '--journal-lead-brightness': '1.18',
      '--journal-image-opacity': '0.41',
      '--journal-left-veil-opacity': '0.88',
      '--journal-bottom-veil-opacity': '0.67',
      '--journal-glow-opacity': '0.22',
      '--journal-copy-max-width': '612px',
      '--journal-card-width': '368px',
      '--journal-card-height': '492px',
    })
  })

  it('gives the leading card a focus state and the trailing cards a glass state', () => {
    const scene = createSceneSnapshot()

    const { container } = render(<SunyataWildernessJournal journal={scene.journal} />)

    const cards = container.querySelectorAll('.wilderness-card')
    expect(cards[0]).toHaveClass('is-active', 'is-focus')
    expect(cards[1]).toHaveClass('is-glass')
    expect(cards[2]).toHaveClass('is-glass')
  })

  it('routes the Read Narrative action to the active sacred story', () => {
    const scene = createSceneSnapshot()

    render(<SunyataWildernessJournal journal={scene.journal} />)

    expect(screen.getByRole('link', { name: 'Read Narrative' })).toHaveAttribute(
      'href',
      '/?story=children-of-scripture',
    )
  })

  it('routes each journal card to its matching sacred story slug', async () => {
    const scene = createSceneSnapshot()
    scene.journal.items = [
      {
        ...scene.journal.items[0],
        slug: 'a-life-in-thangka',
        title: 'Life in Thangka',
      },
      {
        ...scene.journal.items[1],
        slug: 'journey-of-amethyst',
        title: 'Journey of Amethyst',
      },
      {
        ...scene.journal.items[2],
        slug: 'children-of-scripture',
        title: 'Children of Scripture',
      },
    ]

    render(<SunyataWildernessJournal journal={scene.journal} />)
    await act(async () => {})

    const cta = screen.getByRole('link', { name: 'Read Narrative' })
    const cards = screen.getAllByRole('button', { name: /Open / })

    expect(cta).toHaveAttribute('href', '/?story=a-life-in-thangka')

    fireEvent.click(cards[1])
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(cta).toHaveAttribute('href', '/?story=journey-of-amethyst')

    act(() => {
      vi.advanceTimersByTime(900)
    })
    fireEvent.click(cards[2])
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(cta).toHaveAttribute('href', '/?story=children-of-scripture')
  })
})
