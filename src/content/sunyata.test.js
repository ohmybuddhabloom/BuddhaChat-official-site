import { describe, expect, it } from 'vitest'
import {
  createSceneSnapshot,
  normalizeJournalItems,
  normalizeLayoutSections,
} from './sunyata.js'

describe('sunyata content defaults', () => {
  it('provides clean default copy and a full editable section layout', () => {
    const scene = createSceneSnapshot()

    expect(scene.nav.logo).toBe('Sūnyatā')
    expect(scene.footer.copyrightLine1).toBe('© 2024 SŪNYATĀ COLLECTIVE')
    expect(scene.layout.sections).toEqual([
      { id: 'hero', visible: true },
      { id: 'interlude', visible: true },
      { id: 'journal', visible: true },
      { id: 'cards', visible: true },
      { id: 'visual', visible: true },
      { id: 'footer', visible: true },
      { id: 'archive', visible: true },
    ])
  })

  it('normalizes saved section layouts, preserves explicit visibility, and appends missing sections', () => {
    const normalized = normalizeLayoutSections([
      { id: 'visual', visible: true },
      { id: 'cards', visible: false },
      { id: 'unknown', visible: false },
      { id: 'hero', visible: true },
    ])

    expect(normalized).toEqual([
      { id: 'visual', visible: true },
      { id: 'cards', visible: false },
      { id: 'hero', visible: true },
      { id: 'interlude', visible: true },
      { id: 'journal', visible: true },
      { id: 'footer', visible: true },
      { id: 'archive', visible: true },
    ])
  })
})

describe('normalizeJournalItems', () => {
  it('keeps only three cards and migrates legacy remote assets to local files', () => {
    const normalized = normalizeJournalItems([
      {
        title: 'Custom One',
        tag: 'Tag One',
        description: 'Desc One',
        cardUrl: 'https://images.unsplash.com/photo-1',
        backgroundUrl: 'https://images.unsplash.com/photo-a',
      },
      {
        title: 'Custom Two',
        tag: 'Tag Two',
        description: 'Desc Two',
        cardUrl: 'https://images.unsplash.com/photo-2',
        backgroundUrl: 'https://images.unsplash.com/photo-b',
      },
      {
        title: 'Custom Three',
        tag: 'Tag Three',
        description: 'Desc Three',
        cardUrl: 'https://images.unsplash.com/photo-3',
        backgroundUrl: 'https://images.unsplash.com/photo-c',
      },
      {
        title: 'Legacy Fourth',
        tag: 'Tag Four',
        description: 'Desc Four',
        cardUrl: 'https://images.unsplash.com/photo-4',
        backgroundUrl: 'https://images.unsplash.com/photo-d',
      },
    ])

    expect(normalized).toHaveLength(3)
    expect(normalized[0]).toMatchObject({
      title: 'Custom One',
      cardUrl: '/journal/card-1-foreground.png',
      backgroundUrl: '/journal/card-1-background.png',
    })
    expect(normalized[1]).toMatchObject({
      title: 'Custom Two',
      cardUrl: '/journal/card-2-foreground.png',
      backgroundUrl: '/journal/card-2-background.jpg',
    })
    expect(normalized[2]).toMatchObject({
      title: 'Custom Three',
      cardUrl: '/journal/card-3-foreground.png',
      backgroundUrl: '/journal/card-3-background.webp',
    })
  })

  it('preserves custom local assets when they were already edited by the user', () => {
    const normalized = normalizeJournalItems([
      {
        title: 'Edited One',
        tag: 'Tag One',
        description: 'Desc One',
        cardUrl: '/custom/card-one.png',
        backgroundUrl: '/custom/bg-one.png',
      },
    ])

    expect(normalized[0]).toMatchObject({
      title: 'Edited One',
      cardUrl: '/custom/card-one.png',
      backgroundUrl: '/custom/bg-one.png',
    })
  })
})
