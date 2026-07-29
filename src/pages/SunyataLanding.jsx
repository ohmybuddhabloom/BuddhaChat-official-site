import { useEffect, useMemo, useRef, useState } from 'react'
import NoiseOverlay from '../components/sunyata/NoiseOverlay.jsx'
import ScrollVideoBackground from '../components/sunyata/ScrollVideoBackground.jsx'
import SunyataArchive from '../components/sunyata/SunyataArchive.jsx'
import SunyataCards from '../components/sunyata/SunyataCards.jsx'
import SunyataEditor from '../components/sunyata/SunyataEditor.jsx'
import SunyataFooter from '../components/sunyata/SunyataFooter.jsx'
import SunyataHero from '../components/sunyata/SunyataHero.jsx'
import SunyataInterlude from '../components/sunyata/SunyataInterlude.jsx'
import SunyataNav from '../components/sunyata/SunyataNav.jsx'
import SunyataVisual from '../components/sunyata/SunyataVisual.jsx'
import SunyataWildernessJournal from '../components/sunyata/SunyataWildernessJournal.jsx'
import { SACRED_STORIES } from '../content/sacredStories.js'
import {
  MIGRATION_FLAG_KEY,
  STORAGE_KEY,
  createRecoveredLegacyScene,
  createSceneSnapshot,
  isSceneDefaultLike,
  normalizeDonationGalleryItems,
  normalizeJournalItems,
  normalizeLayoutSections,
  sanitizeScene,
} from '../content/sunyata.js'
import { loadProjectScene, saveProjectScene } from '../lib/editorSceneStore.js'
import { isJournalAssetRef } from '../lib/journalAssetStore.js'
import {
  DEFAULT_RESPONSIVE_PROFILE,
  MOBILE_RESPONSIVE_PROFILES,
  getResponsiveProfileForWidth,
  materializeResponsiveOffsets,
  migrateLegacyPixelOffsets,
  seedMobileResponsiveProfiles,
  setProfiledFieldValue,
  stripLegacyPixelOffsets,
  useElementSize,
} from '../lib/responsiveOffsets.js'

const REQUIRED_FUSION_NAV_LINKS = [
  { label: 'Videos', href: '/videos' },
  { label: 'Sutra', href: '/sutra' },
  { label: 'Music', href: '/music' },
  { label: 'Sign in', href: '/login' },
]

const LOGIN_NAV_LABELS = new Set(['login', 'log in', 'sign in'])

function ensureFusionNavLinks(links = []) {
  let hasLoginLink = false
  const normalizedLinks = links
    .filter((link) => {
      const label = link?.label?.trim().toLowerCase()
      const href = link?.href
      const isLegacyLogin = LOGIN_NAV_LABELS.has(label) || href === '/auth/login' || href === '/login'

      if (!isLegacyLogin) {
        return true
      }

      if (hasLoginLink) {
        return false
      }

      hasLoginLink = true
      return true
    })
    .map((link) => {
      const label = link?.label?.trim().toLowerCase()
      const href = link?.href
      const isLegacyLogin = LOGIN_NAV_LABELS.has(label) || href === '/auth/login' || href === '/login'

      return isLegacyLogin ? { ...link, label: 'Sign in', href: '/login' } : link
    })

  const existingHrefs = new Set(
    normalizedLinks
      .map((link) => link?.href)
      .filter((href) => typeof href === 'string'),
  )

  for (const requiredLink of REQUIRED_FUSION_NAV_LINKS) {
    if (!existingHrefs.has(requiredLink.href)) {
      normalizedLinks.push(requiredLink)
    }
  }

  return normalizedLinks
}

function mergeScene(fallback, parsed) {
  const merged = {
    ...fallback,
    ...parsed,
    layout: {
      sections: normalizeLayoutSections(parsed.layout?.sections),
    },
    nav: {
      ...fallback.nav,
      ...parsed.nav,
      links: ensureFusionNavLinks(parsed.nav?.links ?? fallback.nav.links),
    },
    hero: {
      ...fallback.hero,
      ...parsed.hero,
    },
    interlude: {
      ...fallback.interlude,
      ...parsed.interlude,
    },
    buddha: {
      ...fallback.buddha,
      ...parsed.buddha,
    },
    cards: parsed.cards ?? fallback.cards,
    journal: {
      ...fallback.journal,
      ...parsed.journal,
      links: parsed.journal?.links ?? fallback.journal.links,
      theme: {
        ...fallback.journal.theme,
        ...parsed.journal?.theme,
      },
      items: normalizeJournalItems(parsed.journal?.items),
    },
    visual: {
      ...fallback.visual,
      ...parsed.visual,
    },
    quote: {
      ...fallback.quote,
      ...parsed.quote,
    },
    appShowcase: {
      ...fallback.appShowcase,
      ...parsed.appShowcase,
      phones: parsed.appShowcase?.phones ?? fallback.appShowcase.phones,
    },
    donation: {
      ...fallback.donation,
      ...parsed.donation,
      layout: {
        ...fallback.donation.layout,
        ...parsed.donation?.layout,
      },
      tiers: parsed.donation?.tiers ?? fallback.donation.tiers,
      gallery: normalizeDonationGalleryItems(parsed.donation?.gallery),
    },
    footer: {
      ...fallback.footer,
      ...parsed.footer,
    },
  }

  const sanitized = sanitizeScene(merged)
  return seedMobileResponsiveProfiles(sanitized) ?? sanitized
}

function loadInitialScene() {
  if (typeof window === 'undefined') {
    return createSceneSnapshot()
  }

  const fallback = createSceneSnapshot()
  const saved = window.localStorage.getItem(STORAGE_KEY)
  const migrationComplete =
    window.localStorage.getItem(MIGRATION_FLAG_KEY) === '1'

  if (!saved) {
    const recovered = createRecoveredLegacyScene()

    const seededRecovered = seedMobileResponsiveProfiles(recovered) ?? recovered

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seededRecovered))
    window.localStorage.setItem(MIGRATION_FLAG_KEY, '1')
    return seededRecovered
  }

  try {
    const parsed = JSON.parse(saved)
    const merged = mergeScene(fallback, parsed)

    if (!migrationComplete && isSceneDefaultLike(merged)) {
      const recovered = createRecoveredLegacyScene()
      const seededRecovered = seedMobileResponsiveProfiles(recovered) ?? recovered

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seededRecovered))
      window.localStorage.setItem(MIGRATION_FLAG_KEY, '1')
      return seededRecovered
    }

    return merged
  } catch {
    return seedMobileResponsiveProfiles(fallback) ?? fallback
  }
}

function countSavedAssetRefs(scene) {
  let count = 0

  if (isJournalAssetRef(scene?.visual?.imageSrc)) {
    count += 1
  }

  for (const item of scene?.journal?.items ?? []) {
    if (isJournalAssetRef(item?.cardUrl)) {
      count += 1
    }

    if (isJournalAssetRef(item?.backgroundUrl)) {
      count += 1
    }
  }

  return count
}

function getInitialViewportProfile() {
  if (typeof window === 'undefined') {
    return DEFAULT_RESPONSIVE_PROFILE
  }

  return getResponsiveProfileForWidth(window.innerWidth)
}

function SunyataLanding() {
  const cursorRef = useRef(null)
  const heroSectionRef = useRef(null)
  const heroTitleRef = useRef(null)
  const devotionalRef = useRef(null)
  const ghostLabelRef = useRef(null)
  const interludeSectionRef = useRef(null)
  const interludeChatBarRef = useRef(null)
  const journalSectionRef = useRef(null)
  const journalBodyRef = useRef(null)
  const visualSectionRef = useRef(null)
  const visualAnchorRef = useRef(null)
  const [scene, setScene] = useState(loadInitialScene)
  const [editorEnabled] = useState(
    () => new URLSearchParams(window.location.search).get('edit') === '1',
  )
  const [editorOpen, setEditorOpen] = useState(false)
  const [projectSceneReady, setProjectSceneReady] = useState(false)
  const [activeViewportProfile, setActiveViewportProfile] = useState(
    getInitialViewportProfile,
  )
  const [editorResponsiveProfile, setEditorResponsiveProfile] = useState(
    getInitialViewportProfile,
  )
  const heroSectionSize = useElementSize(heroSectionRef)
  const interludeSectionSize = useElementSize(interludeSectionRef)
  const journalBodySize = useElementSize(journalBodyRef)
  const visualAnchorSize = useElementSize(visualAnchorRef)

  const responsiveMetrics = useMemo(
    () => ({
      hero: heroSectionSize,
      interlude: interludeSectionSize,
      journal: journalBodySize,
      quote: visualAnchorSize,
    }),
    [heroSectionSize, interludeSectionSize, journalBodySize, visualAnchorSize],
  )

  const persistedScene = useMemo(
    () => stripLegacyPixelOffsets(scene),
    [scene],
  )

  const renderedScene = useMemo(
    () => materializeResponsiveOffsets(scene, responsiveMetrics, activeViewportProfile),
    [activeViewportProfile, responsiveMetrics, scene],
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const updateProfile = () => {
      setActiveViewportProfile(getResponsiveProfileForWidth(window.innerWidth))
    }

    updateProfile()
    window.addEventListener('resize', updateProfile)

    return () => {
      window.removeEventListener('resize', updateProfile)
    }
  }, [])

  useEffect(() => {
    if (
      typeof window.matchMedia === 'function' &&
      !window.matchMedia('(pointer: fine)').matches
    ) {
      return undefined
    }

    let pointerFrame = 0

    const updatePointer = (event) => {
      if (!cursorRef.current) {
        return
      }

      if (pointerFrame) {
        cancelAnimationFrame(pointerFrame)
      }

      pointerFrame = requestAnimationFrame(() => {
        if (!cursorRef.current) {
          return
        }

        cursorRef.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`
      })
    }

    const expandCursor = () => {
      if (cursorRef.current) {
        cursorRef.current.style.width = '250px'
        cursorRef.current.style.height = '250px'
      }
    }

    const resetCursor = () => {
      if (cursorRef.current) {
        cursorRef.current.style.width = '150px'
        cursorRef.current.style.height = '150px'
      }
    }

    document.addEventListener('mousemove', updatePointer)
    document.addEventListener('mousedown', expandCursor)
    document.addEventListener('mouseup', resetCursor)

    return () => {
      if (pointerFrame) {
        cancelAnimationFrame(pointerFrame)
      }

      document.removeEventListener('mousemove', updatePointer)
      document.removeEventListener('mousedown', expandCursor)
      document.removeEventListener('mouseup', resetCursor)
    }
  }, [])

  useEffect(() => {
    let scrollFrame = 0

    const applyScrollEffects = () => {
      const scrolled = window.pageYOffset

      if (ghostLabelRef.current) {
        ghostLabelRef.current.style.transform = `translate3d(${scrolled * 0.2}px, 0, 0)`
      }

      if (heroTitleRef.current) {
        heroTitleRef.current.style.transform = `translate3d(0, ${scrolled * 0.2}px, 0)`
        heroTitleRef.current.style.opacity = `${Math.max(0, 1 - scrolled / 700)}`
      }

      scrollFrame = 0
    }

    const handleScroll = () => {
      if (!scrollFrame) {
        scrollFrame = requestAnimationFrame(applyScrollEffects)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      if (scrollFrame) {
        cancelAnimationFrame(scrollFrame)
      }

      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedScene))
  }, [persistedScene])

  useEffect(() => {
    let active = true

    const hydrateProjectScene = async () => {
      const projectScene = await loadProjectScene()

      if (!active) {
        return
      }

      if (projectScene) {
        const fallback = createSceneSnapshot()
        const mergedProjectScene = mergeScene(fallback, projectScene)

        setScene((current) => {
          const currentAssetCount = countSavedAssetRefs(current)
          const projectAssetCount = countSavedAssetRefs(mergedProjectScene)

          if (
            projectAssetCount > currentAssetCount ||
            isSceneDefaultLike(current)
          ) {
            window.localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(mergedProjectScene),
            )
            return mergedProjectScene
          }

          return current
        })
      }

      setProjectSceneReady(true)
    }

    hydrateProjectScene()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScene((current) => {
      const migrated = migrateLegacyPixelOffsets(current, responsiveMetrics)
      return migrated ?? current
    })
  }, [
    responsiveMetrics,
  ])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScene((current) => {
      const seeded = seedMobileResponsiveProfiles(current)
      return seeded ?? current
    })
  }, [])

  useEffect(() => {
    if (!editorEnabled || !projectSceneReady) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      saveProjectScene(persistedScene).catch(() => {})
    }, 220)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [editorEnabled, persistedScene, projectSceneReady])

  const updateNavLogo = (value) => {
    setScene((current) => ({
      ...current,
      nav: {
        ...current.nav,
        logo: value,
      },
    }))
  }

  const updateNavLink = (index, value) => {
    setScene((current) => ({
      ...current,
      nav: {
        ...current.nav,
        links: current.nav.links.map((link, linkIndex) =>
          linkIndex === index ? { ...link, label: value } : link,
        ),
      },
    }))
  }

  const updateHero = (
    field,
    value,
    profileAware = false,
    profile = DEFAULT_RESPONSIVE_PROFILE,
  ) => {
    setScene((current) => ({
      ...current,
      hero: profileAware
        ? setProfiledFieldValue(current.hero, field, value, profile)
        : {
            ...current.hero,
            [field]: value,
          },
    }))
  }

  const updateInterlude = (
    field,
    value,
    profileAware = false,
    profile = DEFAULT_RESPONSIVE_PROFILE,
  ) => {
    setScene((current) => ({
      ...current,
      interlude: profileAware
        ? setProfiledFieldValue(current.interlude, field, value, profile)
        : {
            ...current.interlude,
            [field]: value,
          },
    }))
  }

  const updateBuddha = (field, value) => {
    setScene((current) => ({
      ...current,
      buddha: {
        ...current.buddha,
        [field]: value,
      },
    }))
  }

  const updateCard = (index, field, value) => {
    setScene((current) => ({
      ...current,
      cards: current.cards.map((card, cardIndex) =>
        cardIndex === index ? { ...card, [field]: value } : card,
      ),
    }))
  }

  const updateAppShowcase = (field, value) => {
    setScene((current) => ({
      ...current,
      appShowcase: {
        ...current.appShowcase,
        [field]: value,
      },
    }))
  }

  const updateAppShowcasePhone = (index, field, value) => {
    setScene((current) => ({
      ...current,
      appShowcase: {
        ...current.appShowcase,
        phones: current.appShowcase.phones.map((phone, phoneIndex) =>
          phoneIndex === index ? { ...phone, [field]: value } : phone,
        ),
      },
    }))
  }

  const updateJournal = (
    field,
    value,
    profileAware = false,
    profile = DEFAULT_RESPONSIVE_PROFILE,
  ) => {
    setScene((current) => ({
      ...current,
      journal: profileAware
        ? setProfiledFieldValue(current.journal, field, value, profile)
        : {
            ...current.journal,
            [field]: value,
          },
    }))
  }

  const updateJournalLink = (index, value) => {
    setScene((current) => ({
      ...current,
      journal: {
        ...current.journal,
        links: current.journal.links.map((link, linkIndex) =>
          linkIndex === index ? value : link,
        ),
      },
    }))
  }

  const updateJournalTheme = (field, value) => {
    setScene((current) => ({
      ...current,
      journal: {
        ...current.journal,
        theme: {
          ...current.journal.theme,
          [field]: value,
        },
      },
    }))
  }

  const updateJournalItem = (index, field, value) => {
    setScene((current) => ({
      ...current,
      journal: {
        ...current.journal,
        items: current.journal.items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item,
        ),
      },
    }))
  }

  const updateVisual = (
    field,
    value,
    profileAware = false,
    profile = DEFAULT_RESPONSIVE_PROFILE,
  ) => {
    setScene((current) => ({
      ...current,
      visual: profileAware
        ? setProfiledFieldValue(current.visual, field, value, profile)
        : {
            ...current.visual,
            [field]: value,
          },
    }))
  }

  const updateDonation = (field, value) => {
    setScene((current) => ({
      ...current,
      donation: {
        ...current.donation,
        [field]: value,
      },
    }))
  }

  const updateDonationTier = (index, field, value) => {
    setScene((current) => ({
      ...current,
      donation: {
        ...current.donation,
        tiers: current.donation.tiers.map((tier, tierIndex) =>
          tierIndex === index ? { ...tier, [field]: value } : tier,
        ),
      },
    }))
  }

  const updateDonationLayout = (field, value) => {
    setScene((current) => ({
      ...current,
      donation: {
        ...current.donation,
        layout: {
          ...current.donation.layout,
          [field]: value,
        },
      },
    }))
  }

  const updateDonationGalleryItem = (index, field, value) => {
    setScene((current) => ({
      ...current,
      donation: {
        ...current.donation,
        gallery: current.donation.gallery.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item,
        ),
      },
    }))
  }

  const updateQuote = (
    field,
    value,
    profileAware = false,
    profile = DEFAULT_RESPONSIVE_PROFILE,
  ) => {
    setScene((current) => ({
      ...current,
      quote: profileAware
        ? setProfiledFieldValue(current.quote, field, value, profile)
        : {
            ...current.quote,
            [field]: value,
          },
    }))
  }

  const updateFooter = (field, value) => {
    setScene((current) => ({
      ...current,
      footer: {
        ...current.footer,
        [field]: value,
      },
    }))
  }

  const updateSectionOrder = (sectionId, direction) => {
    setScene((current) => {
      const nextSections = [...current.layout.sections]
      const currentIndex = nextSections.findIndex(
        (section) => section.id === sectionId,
      )

      if (currentIndex === -1) {
        return current
      }

      const targetIndex =
        direction === 'up' ? currentIndex - 1 : currentIndex + 1

      if (targetIndex < 0 || targetIndex >= nextSections.length) {
        return current
      }

      const [section] = nextSections.splice(currentIndex, 1)
      nextSections.splice(targetIndex, 0, section)

      return {
        ...current,
        layout: {
          ...current.layout,
          sections: nextSections,
        },
      }
    })
  }

  const updateSectionVisibility = (sectionId, visible) => {
    setScene((current) => ({
      ...current,
      layout: {
        ...current.layout,
        sections: current.layout.sections.map((section) =>
          section.id === sectionId ? { ...section, visible } : section,
        ),
      },
    }))
  }

  const resetScene = () => {
    const freshScene = createSceneSnapshot()
    setScene(seedMobileResponsiveProfiles(freshScene) ?? freshScene)
  }

  const interludeVisible = scene.layout.sections.some(
    (section) => section.id === 'interlude' && section.visible,
  )

  const orderedSections = useMemo(() => {
    const heroNode = (
      <SunyataHero
        key="hero"
        sectionRef={heroSectionRef}
        heroTitleRef={heroTitleRef}
        devotionalRef={devotionalRef}
        hero={renderedScene.hero}
        media={
          <ScrollVideoBackground
            heroSectionRef={heroSectionRef}
            endSectionRef={interludeVisible ? interludeSectionRef : visualSectionRef}
            stopTargetRef={interludeVisible ? interludeChatBarRef : null}
            rangeKey={`${renderedScene.interlude.chatX}:${renderedScene.interlude.chatY}:${scene.buddha.stopViewportY}:${scene.layout.sections.map((section) => `${section.id}:${section.visible}`).join('|')}`}
            scrollEndId="dialogue"
            buddha={
              MOBILE_RESPONSIVE_PROFILES.includes(activeViewportProfile)
                ? { ...scene.buddha, x: 0 }
                : scene.buddha
            }
          />
        }
      />
    )

    const sectionMap = {
      hero: heroNode,
      interlude: (
        <SunyataInterlude
          key="interlude"
          sectionRef={interludeSectionRef}
          chatBarRef={interludeChatBarRef}
          interlude={renderedScene.interlude}
        />
      ),
      journal: (
        <SunyataWildernessJournal
          key="journal"
          bodyRef={journalBodyRef}
          sectionRef={journalSectionRef}
          journal={renderedScene.journal}
        />
      ),
      cards: (
        <SunyataCards
          key="cards"
          cards={scene.cards}
          showcase={scene.appShowcase}
        />
      ),
      visual: (
        <SunyataVisual
          key="visual"
          sectionRef={visualSectionRef}
          visualAnchorRef={visualAnchorRef}
          ghostLabelRef={ghostLabelRef}
          visual={renderedScene.visual}
          quote={renderedScene.quote}
          donation={scene.donation}
        />
      ),
      footer: <SunyataFooter key="footer" footer={scene.footer} />,
      archive: <SunyataArchive key="archive" />,
    }

    return scene.layout.sections
      .filter((section) => section.visible)
      .map((section) => sectionMap[section.id])
      .filter(Boolean)
  }, [
    activeViewportProfile,
    interludeVisible,
    renderedScene.hero,
    renderedScene.interlude,
    renderedScene.journal,
    renderedScene.quote,
    renderedScene.visual,
    scene.buddha,
    scene.cards,
    scene.donation,
    scene.footer,
    scene.layout.sections,
    scene.appShowcase,
  ])

  return (
    <main className={`sunyata-page${projectSceneReady ? ' scene-ready' : ''}${editorEnabled && editorOpen ? ' editor-open' : ''}`}>
      <div ref={cursorRef} className="sunyata-cursor" aria-hidden="true" />
      <NoiseOverlay />
      <div className="void-bg" aria-hidden="true" />
      {editorEnabled && <SunyataEditor
        editorOpen={editorOpen}
        onToggle={() => setEditorOpen((current) => !current)}
        responsiveProfile={editorResponsiveProfile}
        onResponsiveProfileChange={setEditorResponsiveProfile}
        scene={scene}
        updateNavLogo={updateNavLogo}
        updateNavLink={updateNavLink}
        updateHero={updateHero}
        updateInterlude={updateInterlude}
        updateBuddha={updateBuddha}
        updateCard={updateCard}
        updateAppShowcase={updateAppShowcase}
        updateAppShowcasePhone={updateAppShowcasePhone}
        updateJournal={updateJournal}
        updateJournalLink={updateJournalLink}
        updateJournalTheme={updateJournalTheme}
        updateJournalItem={updateJournalItem}
        updateVisual={updateVisual}
        updateDonation={updateDonation}
        updateDonationLayout={updateDonationLayout}
        updateDonationTier={updateDonationTier}
        updateDonationGalleryItem={updateDonationGalleryItem}
        updateQuote={updateQuote}
        updateFooter={updateFooter}
        updateSectionOrder={updateSectionOrder}
        updateSectionVisibility={updateSectionVisibility}
        onReset={resetScene}
      />}

      <div className="sunyata-preview">
        <SunyataNav nav={scene.nav} stories={SACRED_STORIES} />
        {orderedSections}
      </div>
    </main>
  )
}

export default SunyataLanding
