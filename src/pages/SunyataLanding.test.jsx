import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SunyataLanding from './SunyataLanding.jsx'
import { STORAGE_KEY, createSceneSnapshot } from '../content/sunyata.js'

vi.mock('../components/sunyata/NoiseOverlay.jsx', () => ({
  default: () => <div data-testid="noise-overlay" />,
}))

vi.mock('../components/sunyata/ScrollVideoBackground.jsx', () => ({
  default: () => <div data-testid="scroll-video-background" />,
}))

vi.mock('../lib/journalAssetStore.js', () => ({
  resolveJournalImageSource: vi.fn(async (source) => ({
    src: source,
    revoke() {},
  })),
  saveJournalImageFile: vi.fn(),
}))

vi.mock('../lib/editorSceneStore.js', () => ({
  loadProjectScene: vi.fn(async () => null),
  saveProjectScene: vi.fn(async () => {}),
}))

describe('SunyataLanding layout controls', () => {
  it('renders the editor toggle', () => {
    window.history.pushState({}, '', '/?edit=1')

    render(<SunyataLanding />)

    expect(screen.getByRole('button', { name: '打开编辑器' })).toBeInTheDocument()
  })

  it('renders sections in saved order and hides disabled sections', () => {
    const scene = createSceneSnapshot()
    scene.layout.sections = [
      { id: 'visual', visible: true },
      { id: 'hero', visible: true },
      { id: 'cards', visible: false },
      { id: 'interlude', visible: false },
      { id: 'journal', visible: false },
      { id: 'footer', visible: false },
      { id: 'archive', visible: false },
    ]

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scene))

    const { container } = render(<SunyataLanding />)
    const previewChildren = [...container.querySelectorAll('.sunyata-preview > *')]
    const renderedClasses = previewChildren.map((node) => node.className)

    expect(renderedClasses[0]).toContain('sunyata-nav')
    expect(renderedClasses[1]).toContain('visual-quote-section')
    expect(renderedClasses[2]).toContain('hero-container')
    expect(container.querySelector('.content-section')).toBeNull()
    expect(container.querySelector('.wilderness-journal-section')).toBeNull()
    expect(container.querySelector('.archive-section')).toBeNull()
  })

  it('preserves saved navigation while adding required fusion links', () => {
    const scene = createSceneSnapshot()
    scene.nav.links = [
      { label: 'The Path', href: '#path' },
      { label: 'Story', href: '#silence' },
    ]

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scene))

    render(<SunyataLanding />)

    expect(screen.getByRole('link', { name: 'Videos' })).toHaveAttribute('href', '/videos')
    expect(screen.getByRole('link', { name: 'Sutra' })).toHaveAttribute('href', '/sutra')
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth/login')
  })

  it('migrates legacy pixel offsets and rewrites storage with percentage fields', async () => {
    const scene = createSceneSnapshot()
    scene.hero.copyX = 180
    scene.interlude.chatY = 24
    scene.journal.imageX = 120
    scene.quote.x = -96

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1024,
    })
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 768,
    })

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scene))

    render(<SunyataLanding />)

    await waitFor(() => {
      const persisted = JSON.parse(window.localStorage.getItem(STORAGE_KEY))

      expect(persisted.hero.copyXPercent).toBeCloseTo(17.578, 3)
      expect(persisted.hero.copyX).toBeUndefined()
      expect(persisted.interlude.chatYPercent).toBeCloseTo(3.125, 3)
      expect(persisted.journal.imageXPercent).toBeCloseTo(11.719, 3)
      expect(persisted.quote.xPercent).toBeCloseTo(-9.375, 3)
      expect(persisted.quote.x).toBeUndefined()
    })
  })
})
