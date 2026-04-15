import { describe, expect, it } from 'vitest'
import projectScene from '../../public/editor-state/scene.json'
import {
  createSceneSnapshot,
  normalizeDonationGalleryItems,
  normalizeJournalItems,
  normalizeLayoutSections,
} from './sunyata.js'

describe('sunyata content defaults', () => {
  it('provides clean default copy and a full editable section layout', () => {
    const scene = createSceneSnapshot()

    expect(scene.nav.logo).toBe('Sūnyatā')
    expect(scene.footer.titleLine1).toBe('Seek and')
    expect(scene.footer.titleLine2).toBe('it is given')
    expect(scene.footer.copyrightLine1).toBe('')
    expect(scene.footer.copyrightLine2).toBe('')
    expect(scene.layout.sections).toEqual([
      { id: 'hero', visible: true },
      { id: 'interlude', visible: true },
      { id: 'journal', visible: true },
      { id: 'cards', visible: true },
      { id: 'visual', visible: true },
      { id: 'footer', visible: true },
      { id: 'archive', visible: true },
    ])
    expect(scene.appShowcase.title).toBe('The Digital Sanctuary.')
    expect(scene.appShowcase.phones).toHaveLength(3)
    expect(scene.donation.gallery).toHaveLength(2)
    expect(scene.donation.gallery[0].title).toBe('Bodhi Seed Mala')
    expect(scene.donation.gallery[1].title).toBe('Lapis Wisdom')
    expect(scene.donation.visible).toBe(false)
    expect(scene.donation.layout).toMatchObject({
      copyWidthPercent: 36,
      topSpacing: 92,
      gap: 40,
      cardRadius: 28,
    })
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

describe('normalizeDonationGalleryItems', () => {
  it('keeps only the supported two donation gallery cards and fills missing fields', () => {
    const normalized = normalizeDonationGalleryItems([
      {
        title: 'Custom One',
        note: 'Note One',
        overlay: 'Overlay One',
        imageSrc: '/custom/one.png',
      },
      {
        title: 'Custom Two',
      },
      {
        title: 'Should Be Dropped',
      },
    ])

    expect(normalized).toHaveLength(2)
    expect(normalized[0]).toMatchObject({
      title: 'Custom One',
      note: 'Note One',
      overlay: 'Overlay One',
      imageSrc: '/custom/one.png',
    })
    expect(normalized[1]).toMatchObject({
      title: 'Custom Two',
      note: 'Sourced from high-altitude veins',
    })
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

  it('keeps the project scene journal titles aligned with their story slugs', () => {
    const pairs = projectScene.journal.items.map(({ title, slug }) => ({
      title,
      slug,
    }))

    expect(pairs).toEqual([
      {
        title: 'Life in Thangka',
        slug: 'a-life-in-thangka',
      },
      {
        title: 'Journey of Amethyst',
        slug: 'journey-of-amethyst',
      },
      {
        title: 'Children of Scripture',
        slug: 'children-of-scripture',
      },
    ])
  })
})
