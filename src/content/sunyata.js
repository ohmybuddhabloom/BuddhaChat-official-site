import { SACRED_STORIES_BY_SLUG } from './sacredStories.js'

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
    slug: 'children-of-scripture',
    title: 'Highlands',
    tag: 'Terrain Study',
    description:
      'Shadow play across the Scottish glens. A study in emerald and grey, where the clouds meet the earth in perpetual mist.',
    backgroundUrl: '/journal/card-1-background.webp',
    cardUrl: '/journal/card-1-foreground.webp',
  },
  {
    slug: 'journey-of-amethyst',
    title: 'The Taiga',
    tag: 'Flora Folio',
    description:
      'Ancient conifers standing sentinel against the biting frost. Deep forest textures captured in the golden hour of sub-arctic winter.',
    backgroundUrl: '/journal/card-2-background.webp',
    cardUrl: '/journal/card-2-foreground.webp',
  },
  {
    slug: 'a-life-in-thangka',
    title: 'Basaltic',
    tag: 'Volcanic Arc',
    description:
      'Geometric purity of volcanic structures. Where liquid fire solidified into obsidian pillars amidst the North Atlantic spray.',
    backgroundUrl: '/journal/card-3-background.webp',
    cardUrl: '/journal/card-3-foreground.webp',
  },
]

const JOURNAL_TITLE_TO_STORY_SLUG = {
  'Life in Thangka': 'a-life-in-thangka',
  'Journey of Amethyst': 'journey-of-amethyst',
  'Children of Scripture': 'children-of-scripture',
}

const defaultDonationGalleryItems = [
  {
    title: 'Bodhi Seed Mala',
    note: '108 beads of traditional wisdom',
    overlay: 'Sandalwood Essence',
    imageSrc:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAqRYy9OXZqtyYPJV4l7ecMdTIomNUoaQBw1MVd0Thoo4aSAy1l1Xq1xvfnA7BSZnMCqZ-BjwRu_ZShfpIi55F6RzFt8CIGx-WFLdlDTNV9wit3KlhjZCx9jcCFBBzUsy2Na6YY5vVYzx9QkD0I0uM4-jjBfT8V0Nv1rrqg-CogNElgl52l_wceJGU32knzKZ6QFp0G6tAs35bs8k5UU6qG8XAyCG9Cl7RzDYLn4cZNQLBTI3rjd8mSErJR7xM4J0fP8fdg9Vk7l1k',
    imageAlt:
      'Close-up of sacred sandalwood prayer beads on a weathered stone surface with soft morning light and lens flare',
  },
  {
    title: 'Lapis Wisdom',
    note: 'Sourced from high-altitude veins',
    overlay: 'Celestial Vision',
    imageSrc:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC35x9I823IWO30P2wbJTc6RI_cfVSWQF1gKLRPQSeuf70dF78tPczfn-zDB9hyG_O5e1iaHRsBio7IhAGxfqKvaLKXMaUfVW3ZhId1kiikyn3mgegl3mcpSbBxSu4maVG_LMfwLW72dwBcPOjbBEN28d1V2QcuF-pniE4EHz94ocBpdb-QHuhRFr0CLWLi1Xn6pDxDWHYfPhMmiPK1_Hzd5Y2XQOPXIzwP7dCJwIJ9AWz7wkfOQYzWyAw-K-p1-N5RVB_cAnpqjtU',
    imageAlt:
      'Elegant wrist wearing a lapis lazuli prayer bracelet with gold accents against a soft blurred botanical background',
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
    const repairedSlugFromTitle =
      JOURNAL_TITLE_TO_STORY_SLUG[currentItem?.title] ?? null
    const requestedSlug = repairedSlugFromTitle ?? currentItem?.slug
    const normalizedSlug = SACRED_STORIES_BY_SLUG[requestedSlug]
      ? requestedSlug
      : fallbackItem.slug

    return {
      slug: normalizedSlug,
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

export function normalizeDonationGalleryItems(items) {
  return defaultDonationGalleryItems.map((fallbackItem, index) => {
    const currentItem = items?.[index]

    return {
      title: currentItem?.title ?? fallbackItem.title,
      note: currentItem?.note ?? fallbackItem.note,
      overlay: currentItem?.overlay ?? fallbackItem.overlay,
      imageSrc: currentItem?.imageSrc ?? fallbackItem.imageSrc,
      imageAlt: currentItem?.imageAlt ?? fallbackItem.imageAlt,
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
      { label: 'Story', href: '#silence' },
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
    responseLabel: 'Buddha replies',
    responseText:
      'Offer the question gently. The next clear step usually arrives before the full answer does.',
    responseDelayMs: 420,
    fadeDurationMs: 320,
    textX: 0,
    textY: 0,
    chatX: 0,
    chatY: 0,
    replyX: 0,
    replyY: 0,
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
  appShowcase: {
    kicker: 'A Sacred Digital Experience',
    title: 'The Digital Sanctuary.',
    lead:
      'Reconnect with your inner stillness. Foshuo translates ritual, wisdom, and ceremonial calm into a digital experience that feels weighted, luminous, and memorable.',
    primaryActionLabel: 'Download Now',
    secondaryActionLabel: 'Watch the Story',
    reserveHeading: 'Reserve Your Invite',
    reserveNote: 'To ensure a truly serene experience, the Buddha Chat app is still being mindfully developed. Breathe and rest in the present—we will write to you the moment it arrives.',
    reserveEmailPlaceholder: 'Enter your email',
    reserveSubmitLabel: 'Submit',
    proofText: 'Joined by 12,000+ seekers worldwide',
    proofAvatars: [
      {
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5BcCtipHMXi3CNEZdMB5V7Sa9HEt9olmb079PiiWwCuuoIW3YE6eV0yCYR2gGvmv5F17M4-Qad9_7Jnkt2RV6iYB9jPEoLMJYeWDS4XN5URc5BrPhnyRezaOWxSdQtxsY0eevSGwpPscFmMKurPlkGerZ5SizhEHsEpeOxtqRusF9IHbhTaOfgkmKmsypUpksB8dtQK-QjA1BRUdFSVFPsndp6o_Obko_5YRdnOFnqvONV-eAS-5HCnRNEqaRJrtb7QtT6rQUH30',
        alt: 'Close-up portrait of a woman',
      },
      {
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDB1_kVUHFOoMKNX2rjc_IbyRya62SO9A71_WrqJuCu33WuwTms6oItmzcPPjk2GYKrDFPFm8iB4AFWV0IzTc41pogRb9U5GW515AMAY0Fr30z10hv5mwdemONWfyyKag7zbGYWfc265ofudqSQtPHwvGBoeu6v2owuLhstEez14FjY3-rTvDFGkNlYwlVKNFW4t56KMyguI86fCY87m0e4KwL6UbaSvWp_OMhmqnBpWkvUx60KA3j2OQpLuERAChfxrqfIoCbUT5M',
        alt: 'Portrait of a man',
      },
      {
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLvSLFYpG6B2imUbaVnvGdPcxC7QuRLDug4JAYKnAojVjK7zjBh0uhzORiuRj5nzcCIySQ_15ownvAgACbTvjBCStGRkqp3s8pTDUD7yqRhh7gnyn_VQvmVC0Hc--PI_Sctw4FCla-hMWW2i4KLaiIS4m5juH09qS8OTvgI4VlglePEVRCdMCp9-yoZlNsIDwquzw1QEZkUNnm5PQfiJAvqyL20gOAlSooTzMPeCtHCbyVqe5iUFpw0S71-ud199T1E5xDVVIYe8k',
        alt: 'Portrait of a seeker',
      },
    ],
    phones: [
      {
        key: 'left',
        imageSrc: '/app-previews/master-updates.webp',
        imageAlt: 'Foshuo wisdom feed',
        layout: 'left',
      },
      {
        key: 'center',
        imageSrc: '/app-previews/foshuo-home.webp',
        imageAlt: 'Foshuo home sanctuary screen',
        layout: 'center',
      },
      {
        key: 'right',
        imageSrc: '/app-previews/qa-detail.webp',
        imageAlt: 'Foshuo detail practice screen',
        layout: 'right',
      },
    ],
  },
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
    imageX: 0,
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
    backgroundFeather: 72,
    studioLabel: 'The Studio',
    studioText: 'Kyoto / Zurich / Joshua Tree',
    philosophyLabel: 'Philosophy',
    philosophyText:
      'Reduction as a path to abundance. We create the space where spirit manifests.',
  },
  donation: {
    visible: false,
    eyebrow: 'Sacred Offering',
    heading: 'Manifest Compassion Through Dana',
    kicker: 'Circle of Giving',
    note: 'A small offering keeps the app alive, funds future teachings, and helps us share a quieter digital ritual with more people.',
    panelNote:
      'The act of giving is a practice in itself. Every contribution ripples outward, bringing light and peace to the Sangha.',
    emailPlaceholder: 'Leave your email for the donation link',
    customPlaceholder: 'Custom',
    actionLabel: 'Continue',
    successMessage: 'Your donation link is being prepared.',
    supportNote:
      'Your offering supports the maintenance of this digital sanctuary.',
    layout: {
      copyWidthPercent: 36,
      topSpacing: 92,
      gap: 40,
      cardRadius: 28,
    },
    tiers: [
      {
        id: 'light-a-candle',
        amount: '0.99',
        label: '$0.99',
        description: 'Light a candle',
      },
      {
        id: 'open-a-gate',
        amount: '5.99',
        label: '$5.99',
        description: 'Open a gate',
      },
      {
        id: 'support-a-retreat',
        amount: '12.99',
        label: '$12.99',
        description: 'Support a retreat',
      },
    ],
    gallery: defaultDonationGalleryItems,
  },
  footer: {
    titleLine1: 'Seek and',
    titleLine2: 'it is given',
    ctaLabel: 'Join the circle',
    copyrightLine1: '',
    copyrightLine2: '',
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
    appShowcase: {
      ...defaultScene.appShowcase,
      ...snapshot.appShowcase,
      proofAvatars:
        snapshot.appShowcase?.proofAvatars ?? defaultScene.appShowcase.proofAvatars,
      phones: snapshot.appShowcase?.phones ?? defaultScene.appShowcase.phones,
    },
    quote: {
      ...defaultScene.quote,
      ...snapshot.quote,
    },
    donation: {
      ...defaultScene.donation,
      ...snapshot.donation,
      layout: {
        ...defaultScene.donation.layout,
        ...snapshot.donation?.layout,
      },
      tiers: snapshot.donation?.tiers ?? defaultScene.donation.tiers,
      gallery: normalizeDonationGalleryItems(snapshot.donation?.gallery),
    },
  }
}

export function isSceneDefaultLike(scene) {
  return JSON.stringify(sanitizeScene(scene)) === JSON.stringify(defaultScene)
}
