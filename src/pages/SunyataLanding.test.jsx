import { render } from '@testing-library/react'
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
})
