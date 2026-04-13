export const STORAGE_KEY = 'sunyata-editor-state-v1'
export const MIGRATION_FLAG_KEY = 'sunyata-editor-migrated-v1'

export const DEFAULT_LAYOUT_SECTIONS = [
  { id: 'hero', visible: true },
  { id: 'interlude', visible: true },
  { id: 'journal', visible: true },
  { id: 'cards', visible: true },
  { id: 'visual', visible: true },
  { id: 'footer', visible: true },
  { id: 'archive', visible: true },
]

const CORRUPTED_DEFAULT_COPY = {
  navLogo: 'S奴nyat膩',
  footerCopyright: '漏 2024 S弄NYAT膧 COLLECTIVE',
}

const defaultJournalItems = [
  {
    title: 'Highlands',
    tag: 'Terrain Study',
    description:
      'Shadow play across the Scottish glens. A study in emerald and grey, where the clouds meet the earth in perpetual mist.',
    backgroundUrl: '/journal/card-1-background.png',
    cardUrl: '/journal/card-1-foreground.png',
  },
  {
    title: 'The Taiga',
    tag: 'Flora Folio',
    description:
      'Ancient conifers standing sentinel against the biting frost. Deep forest textures captured in the golden hour of sub-arctic winter.',
    backgroundUrl: '/journal/card-2-background.jpg',
    cardUrl: '/journal/card-2-foreground.png',
  },
  {
    title: 'Basaltic',
    tag: 'Volcanic Arc',
    description:
      'Geometric purity of volcanic structures. Where liquid fire solidified into obsidian pillars amidst the North Atlantic spray.',
    backgroundUrl: '/journal/card-3-background.webp',
    cardUrl: '/journal/card-3-foreground.png',
  },
]

function isLegacyJournalAsset(url) {
  return typeof url === 'string' && url.includes('images.unsplash.com')
}

export function normalizeLayoutSections(sections) {
  const defaultsById = new Map(
    DEFAULT_LAYOUT_SECTIONS.map((section) => [section.id, section]),
  )
  const normalized = []
  const seen = new Set()

  for (const section of sections ?? []) {
    if (!section || typeof section.id !== 'string' || seen.has(section.id)) {
      continue
    }

    const fallback = defaultsById.get(section.id)

    if (!fallback) {
      continue
    }

    normalized.push({
      id: section.id,
      visible:
        typeof section.visible === 'boolean' ? section.visible : fallback.visible,
    })
    seen.add(section.id)
  }

  for (const fallback of DEFAULT_LAYOUT_SECTIONS) {
    if (seen.has(fallback.id)) {
      continue
    }

    normalized.push({ ...fallback })
  }

  return normalized
}

export function normalizeJournalItems(items) {
  return defaultJournalItems.map((fallbackItem, index) => {
    const currentItem = items?.[index]

    return {
      title: currentItem?.title ?? fallbackItem.title,
      tag: currentItem?.tag ?? fallbackItem.tag,
      description: currentItem?.description ?? fallbackItem.description,
      cardUrl:
        !currentItem?.cardUrl || isLegacyJournalAsset(currentItem.cardUrl)
          ? fallbackItem.cardUrl
          : currentItem.cardUrl,
      backgroundUrl:
        !currentItem?.backgroundUrl ||
        isLegacyJournalAsset(currentItem.backgroundUrl)
          ? fallbackItem.backgroundUrl
          : currentItem.backgroundUrl,
    }
  })
}

export const defaultScene = {
  layout: {
    sections: normalizeLayoutSections(),
  },
  nav: {
    logo: 'Sūnyatā',
    links: [
      { label: 'The Path', href: '#path' },
      { label: 'Sanctuary', href: '#sanctuary' },
      { label: 'Vessels', href: '#vessels' },
      { label: 'Silence', href: '#silence' },
    ],
  },
  hero: {
    title: 'the luminous void',
    subtitle:
      'she whispers the ancient mantras he is hearing in his soul. showing the inspiration spirit channeling into the physical vessel.',
    scrollLabel: 'scroll to enter',
    copyX: 0,
    copyY: 0,
    leftWidth: 40,
    leftPadding: 10,
  },
  interlude: {
    kicker: 'Quiet Dialogue',
    title: 'Place a question into the hush.',
    note: 'The second screen should stay mostly empty, with only a soft line of text and a single field below.',
    placeholder: 'Ask Buddha a question...',
    actionLabel: 'Offer',
    textX: 0,
    textY: 0,
    chatX: 0,
    chatY: 0,
  },
  buddha: {
    x: 0,
    y: 0,
    travelY: 260,
    stopViewportY: 50,
    scale: 100,
    featherRange: 84,
    featherStrength: 68,
  },
  cards: [
    {
      number: '01 / DHARMA',
      title: 'Sacred Breath',
      description:
        'A guided transition into the stillness between thoughts. Our high-resolution sensory meditations utilize spatial audio and light frequency tuning.',
      offsetY: 50,
    },
    {
      number: '02 / SANGHA',
      title: 'Silent Retreats',
      description:
        'Architecture designed for nothingness. Private sanctuaries in the high desert where the horizon meets the mind.',
      offsetY: 0,
    },
    {
      number: '03 / ARTIFACT',
      title: 'Bronze Vessels',
      description:
        'Limited edition meditation tools cast in raw brass, hand-polished to a mirror finish to reflect the transient nature of the self.',
      offsetY: 80,
    },
  ],
  journal: {
    edition: 'Edition No. 04',
    brand: 'snapstory journal',
    actionLabel: 'Read Narrative',
    links: ['Archive', 'Expeditions', 'Folio', 'Login'],
    textX: 0,
    textY: 0,
    imageX: 0,
    imageY: 0,
    theme: {
      base: '#08130f',
      overlayColor: '#08130f',
      accent: '#cda55b',
      text: '#efe7d7',
      overlayOpacity: 72,
      leadBrightness: 104,
      imageOpacity: 34,
      leftVeilOpacity: 98,
      bottomVeilOpacity: 84,
      ambientGlowOpacity: 16,
      copyMaxWidth: 560,
      cardWidth: 340,
      cardHeight: 460,
    },
    items: defaultJournalItems,
  },
  visual: {
    ghostLabel: 'PRESENCE',
    imageSrc:
      'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?q=80&w=2000&auto=format&fit=crop',
    imageAlt: 'Abstract Light',
    imageWidth: 60,
    ghostRight: -5,
    ghostBottom: 10,
  },
  quote: {
    text: '"Form is exactly emptiness, emptiness is exactly form. Sensation, thought, impulse, consciousness are also like this."',
    maxWidth: 800,
    x: 0,
    y: 0,
    backgroundOpacity: 20,
    backgroundBlur: 44,
    backgroundPadding: 28,
    studioLabel: 'The Studio',
    studioText: 'Kyoto / Zurich / Joshua Tree',
    philosophyLabel: 'Philosophy',
    philosophyText:
      'Reduction as a path to abundance. We create the space where spirit manifests.',
  },
  footer: {
    titleLine1: 'Begin your',
    titleLine2: 'quietude.',
    ctaLabel: 'Join the circle',
    copyrightLine1: '© 2024 SŪNYATĀ COLLECTIVE',
    copyrightLine2: 'ALL RIGHTS RESERVED IN THE VOID',
  },
}

function sanitizeLegacyCopy(scene) {
  const nextScene = { ...scene }

  if (nextScene.nav?.logo === CORRUPTED_DEFAULT_COPY.navLogo) {
    nextScene.nav = {
      ...nextScene.nav,
      logo: defaultScene.nav.logo,
    }
  }

  if (
    nextScene.footer?.copyrightLine1 ===
    CORRUPTED_DEFAULT_COPY.footerCopyright
  ) {
    nextScene.footer = {
      ...nextScene.footer,
      copyrightLine1: defaultScene.footer.copyrightLine1,
    }
  }

  return nextScene
}

export function createSceneSnapshot() {
  return JSON.parse(JSON.stringify(defaultScene))
}

const recoveredLegacyOverrides = {
  nav: {
    logo: 'Buddha chat',
  },
  hero: {
    copyX: 180,
    leftWidth: 42,
    leftPadding: 9,
  },
  buddha: {
    x: -9,
    travelY: 135,
    featherStrength: 71,
  },
}

export function createRecoveredLegacyScene() {
  const snapshot = createSceneSnapshot()

  return sanitizeLegacyCopy({
    ...snapshot,
    nav: {
      ...snapshot.nav,
      ...recoveredLegacyOverrides.nav,
    },
    hero: {
      ...snapshot.hero,
      ...recoveredLegacyOverrides.hero,
    },
    buddha: {
      ...snapshot.buddha,
      ...recoveredLegacyOverrides.buddha,
    },
  })
}

export function sanitizeScene(scene) {
  const snapshot = sanitizeLegacyCopy(scene)

  return {
    ...snapshot,
    layout: {
      sections: normalizeLayoutSections(snapshot.layout?.sections),
    },
    journal: {
      ...snapshot.journal,
      items: normalizeJournalItems(snapshot.journal?.items),
    },
    quote: {
      ...defaultScene.quote,
      ...snapshot.quote,
    },
  }
}

export function isSceneDefaultLike(scene) {
  return JSON.stringify(sanitizeScene(scene)) === JSON.stringify(defaultScene)
}
