import { useEffect, useState } from 'react'

const EMPTY_SIZE = { width: 0, height: 0 }
export const DEFAULT_RESPONSIVE_PROFILE = 'desktop'
export const LEGACY_MOBILE_RESPONSIVE_PROFILE = 'mobile'
export const MOBILE_SMALL_RESPONSIVE_PROFILE = 'mobile-sm'
export const MOBILE_MEDIUM_RESPONSIVE_PROFILE = 'mobile-md'
export const MOBILE_LARGE_RESPONSIVE_PROFILE = 'mobile-lg'
export const MOBILE_RESPONSIVE_PROFILES = [
  MOBILE_SMALL_RESPONSIVE_PROFILE,
  MOBILE_MEDIUM_RESPONSIVE_PROFILE,
  MOBILE_LARGE_RESPONSIVE_PROFILE,
]

const MOBILE_PROFILE_DEFAULTS = {
  [MOBILE_SMALL_RESPONSIVE_PROFILE]: {
    hero: {
      leftWidth: 100,
      leftPadding: 0,
      copyXPercent: 0,
      copyYPercent: 10,
    },
    interlude: {
      textXPercent: 0,
      textYPercent: -2,
      chatXPercent: 0,
      chatYPercent: 0,
    },
    journal: {
      textXPercent: 0,
      textYPercent: 0,
      imageXPercent: 0,
      imageYPercent: 0,
    },
    visual: {
      imageWidth: 88,
      ghostRight: 1,
      ghostBottom: 9,
    },
    quote: {
      xPercent: 0,
      yPercent: 0,
      maxWidth: 276,
    },
  },
  [MOBILE_MEDIUM_RESPONSIVE_PROFILE]: {
    hero: {
      leftWidth: 100,
      leftPadding: 0,
      copyXPercent: 0,
      copyYPercent: 7,
    },
    interlude: {
      textXPercent: 0,
      textYPercent: 0,
      chatXPercent: 0,
      chatYPercent: 0,
    },
    journal: {
      textXPercent: 0,
      textYPercent: 0,
      imageXPercent: 0,
      imageYPercent: 0,
    },
    visual: {
      imageWidth: 84,
      ghostRight: -1,
      ghostBottom: 8,
    },
    quote: {
      xPercent: 0,
      yPercent: 0,
      maxWidth: 316,
    },
  },
  [MOBILE_LARGE_RESPONSIVE_PROFILE]: {
    hero: {
      leftWidth: 100,
      leftPadding: 0,
      copyXPercent: 0,
      copyYPercent: 4,
    },
    interlude: {
      textXPercent: 0,
      textYPercent: 1,
      chatXPercent: 0,
      chatYPercent: 0,
    },
    journal: {
      textXPercent: 0,
      textYPercent: 0,
      imageXPercent: 0,
      imageYPercent: 0,
    },
    visual: {
      imageWidth: 80,
      ghostRight: -3,
      ghostBottom: 7,
    },
    quote: {
      xPercent: 0,
      yPercent: 0,
      maxWidth: 360,
    },
  },
}

const PREVIOUS_MOBILE_PROFILE_DEFAULTS = {
  [MOBILE_SMALL_RESPONSIVE_PROFILE]: {
    hero: {
      leftWidth: 100,
      leftPadding: 0,
      copyXPercent: 0,
      copyYPercent: -14,
    },
    interlude: {
      textXPercent: 0,
      textYPercent: -8,
      chatXPercent: 0,
      chatYPercent: 0,
    },
    journal: {
      textXPercent: 0,
      textYPercent: 0,
      imageXPercent: 0,
      imageYPercent: 0,
    },
    visual: {
      imageWidth: 96,
      ghostRight: 1,
      ghostBottom: 10,
    },
    quote: {
      xPercent: 0,
      yPercent: 0,
      maxWidth: 292,
    },
  },
  [MOBILE_MEDIUM_RESPONSIVE_PROFILE]: {
    hero: {
      leftWidth: 100,
      leftPadding: 0,
      copyXPercent: 0,
      copyYPercent: -8,
    },
    interlude: {
      textXPercent: 0,
      textYPercent: -4,
      chatXPercent: 0,
      chatYPercent: 0,
    },
    journal: {
      textXPercent: 0,
      textYPercent: 0,
      imageXPercent: 0,
      imageYPercent: 0,
    },
    visual: {
      imageWidth: 90,
      ghostRight: -2,
      ghostBottom: 8,
    },
    quote: {
      xPercent: 0,
      yPercent: 0,
      maxWidth: 340,
    },
  },
  [MOBILE_LARGE_RESPONSIVE_PROFILE]: {
    hero: {
      leftWidth: 100,
      leftPadding: 0,
      copyXPercent: 0,
      copyYPercent: -6,
    },
    interlude: {
      textXPercent: 0,
      textYPercent: -2,
      chatXPercent: 0,
      chatYPercent: 0,
    },
    journal: {
      textXPercent: 0,
      textYPercent: 0,
      imageXPercent: 0,
      imageYPercent: 0,
    },
    visual: {
      imageWidth: 84,
      ghostRight: -3,
      ghostBottom: 7,
    },
    quote: {
      xPercent: 0,
      yPercent: 0,
      maxWidth: 388,
    },
  },
}

const RESPONSIVE_OFFSET_FIELDS = {
  hero: [
    { pixel: 'copyX', percent: 'copyXPercent', dimension: 'width' },
    { pixel: 'copyY', percent: 'copyYPercent', dimension: 'height' },
  ],
  interlude: [
    { pixel: 'textX', percent: 'textXPercent', dimension: 'width' },
    { pixel: 'textY', percent: 'textYPercent', dimension: 'height' },
    { pixel: 'chatX', percent: 'chatXPercent', dimension: 'width' },
    { pixel: 'chatY', percent: 'chatYPercent', dimension: 'height' },
  ],
  journal: [
    { pixel: 'textX', percent: 'textXPercent', dimension: 'width' },
    { pixel: 'textY', percent: 'textYPercent', dimension: 'height' },
    { pixel: 'imageX', percent: 'imageXPercent', dimension: 'width' },
    { pixel: 'imageY', percent: 'imageYPercent', dimension: 'height' },
  ],
  quote: [
    { pixel: 'x', percent: 'xPercent', dimension: 'width' },
    { pixel: 'y', percent: 'yPercent', dimension: 'height' },
  ],
}

function hasFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function normalizeProfileName(profile = DEFAULT_RESPONSIVE_PROFILE) {
  return profile === LEGACY_MOBILE_RESPONSIVE_PROFILE
    ? MOBILE_MEDIUM_RESPONSIVE_PROFILE
    : profile
}

function getProfileOverrideCandidates(profile = DEFAULT_RESPONSIVE_PROFILE) {
  const normalizedProfile = normalizeProfileName(profile)

  if (normalizedProfile === DEFAULT_RESPONSIVE_PROFILE) {
    return []
  }

  return [normalizedProfile, LEGACY_MOBILE_RESPONSIVE_PROFILE]
}

function matchesProfileDefaults(profileValues = {}, defaults = {}) {
  return Object.entries(defaults).every(
    ([field, value]) => profileValues?.[field] === value,
  )
}

function cloneResponsiveScene(scene, profile = DEFAULT_RESPONSIVE_PROFILE) {
  const normalizedProfile = normalizeProfileName(profile)
  const getProfiledSection = (section) => {
    const nextSection = {
      ...section,
      profiles: {
        ...section?.profiles,
      },
    }

    for (const mobileProfile of MOBILE_RESPONSIVE_PROFILES) {
      nextSection.profiles[mobileProfile] = {
        ...(section?.profiles?.[mobileProfile] ?? {}),
      }
    }

    if (section?.profiles?.[LEGACY_MOBILE_RESPONSIVE_PROFILE]) {
      nextSection.profiles[LEGACY_MOBILE_RESPONSIVE_PROFILE] = {
        ...section.profiles[LEGACY_MOBILE_RESPONSIVE_PROFILE],
      }
    }

    for (const candidate of getProfileOverrideCandidates(normalizedProfile)) {
      const override = nextSection.profiles?.[candidate]

      if (override) {
        Object.assign(nextSection, override)
        break
      }
    }

    return nextSection
  }

  return {
    ...scene,
    hero: getProfiledSection(scene.hero),
    interlude: getProfiledSection(scene.interlude),
    journal: getProfiledSection(scene.journal),
    visual: getProfiledSection(scene.visual),
    quote: getProfiledSection(scene.quote),
  }
}

function getViewportSize(dimension) {
  if (typeof window === 'undefined') {
    return 0
  }

  return dimension === 'width' ? window.innerWidth : window.innerHeight
}

function getMetricSize(metrics, sectionKey, dimension) {
  const measured = metrics?.[sectionKey]?.[dimension]

  if (hasFiniteNumber(measured) && measured > 0) {
    return measured
  }

  return getViewportSize(dimension)
}

export function pixelToPercent(pixelOffset, size) {
  if (!hasFiniteNumber(pixelOffset) || !hasFiniteNumber(size) || size <= 0) {
    return 0
  }

  return Number(((pixelOffset / size) * 100).toFixed(3))
}

export function percentToPixel(percentOffset, size, fallback = 0) {
  if (hasFiniteNumber(percentOffset) && hasFiniteNumber(size) && size > 0) {
    return (percentOffset / 100) * size
  }

  return hasFiniteNumber(fallback) ? fallback : 0
}

export function getProfiledFieldValue(
  section,
  field,
  profile = DEFAULT_RESPONSIVE_PROFILE,
) {
  for (const candidate of getProfileOverrideCandidates(profile)) {
    const profileValue = section?.profiles?.[candidate]?.[field]

    if (profileValue !== undefined) {
      return profileValue
    }
  }

  return section?.[field]
}

export function setProfiledFieldValue(
  section,
  field,
  value,
  profile = DEFAULT_RESPONSIVE_PROFILE,
) {
  const normalizedProfile = normalizeProfileName(profile)

  if (normalizedProfile === DEFAULT_RESPONSIVE_PROFILE) {
    return {
      ...section,
      [field]: value,
    }
  }

  return {
    ...section,
    profiles: {
      ...section?.profiles,
      [normalizedProfile]: {
        ...(section?.profiles?.[normalizedProfile] ?? {}),
        [field]: value,
      },
    },
  }
}

export function getResponsiveProfileForWidth(width) {
  if (!hasFiniteNumber(width)) {
    return DEFAULT_RESPONSIVE_PROFILE
  }

  if (width <= 389) {
    return MOBILE_SMALL_RESPONSIVE_PROFILE
  }

  if (width <= 414) {
    return MOBILE_MEDIUM_RESPONSIVE_PROFILE
  }

  if (width <= 900) {
    return MOBILE_LARGE_RESPONSIVE_PROFILE
  }

  return DEFAULT_RESPONSIVE_PROFILE
}

export function seedMobileResponsiveProfiles(scene) {
  const nextScene = cloneResponsiveScene(scene)
  let changed = false

  for (const sectionKey of ['hero', 'interlude', 'journal', 'visual', 'quote']) {
    const legacyMobileProfile =
      nextScene[sectionKey].profiles?.[LEGACY_MOBILE_RESPONSIVE_PROFILE]

    if (
      legacyMobileProfile &&
      Object.keys(legacyMobileProfile).length > 0 &&
      Object.keys(
        nextScene[sectionKey].profiles?.[MOBILE_MEDIUM_RESPONSIVE_PROFILE] ?? {},
      ).length === 0
    ) {
      nextScene[sectionKey].profiles[MOBILE_MEDIUM_RESPONSIVE_PROFILE] = {
        ...legacyMobileProfile,
      }
      changed = true
    }

    if (legacyMobileProfile) {
      delete nextScene[sectionKey].profiles[LEGACY_MOBILE_RESPONSIVE_PROFILE]
      changed = true
    }
  }

  for (const [profileName, profileSections] of Object.entries(
    MOBILE_PROFILE_DEFAULTS,
  )) {
    for (const [sectionKey, defaults] of Object.entries(profileSections)) {
      const mobileProfile =
        nextScene[sectionKey].profiles?.[profileName] ?? {}

      if (
        matchesProfileDefaults(
          mobileProfile,
          PREVIOUS_MOBILE_PROFILE_DEFAULTS[profileName]?.[sectionKey],
        )
      ) {
        nextScene[sectionKey].profiles[profileName] = {
          ...defaults,
        }
        changed = true
        continue
      }

      for (const [field, value] of Object.entries(defaults)) {
        if (mobileProfile[field] !== undefined) {
          continue
        }

        nextScene[sectionKey].profiles[profileName][field] = value
        changed = true
      }
    }
  }

  return changed ? nextScene : null
}

export function migrateLegacyPixelOffsets(scene, metrics) {
  let changed = false
  const nextScene = cloneResponsiveScene(scene)

  for (const [sectionKey, fields] of Object.entries(RESPONSIVE_OFFSET_FIELDS)) {
    const section = nextScene[sectionKey]

    for (const { pixel, percent, dimension } of fields) {
      if (hasFiniteNumber(section?.[percent])) {
        continue
      }

      if (!hasFiniteNumber(section?.[pixel])) {
        continue
      }

      const size = getMetricSize(metrics, sectionKey, dimension)

      if (size <= 0) {
        continue
      }

      section[percent] = pixelToPercent(section[pixel], size)
      changed = true
    }
  }

  return changed ? nextScene : null
}

export function materializeResponsiveOffsets(
  scene,
  metrics,
  profile = DEFAULT_RESPONSIVE_PROFILE,
) {
  const nextScene = cloneResponsiveScene(scene, profile)

  for (const [sectionKey, fields] of Object.entries(RESPONSIVE_OFFSET_FIELDS)) {
    const section = nextScene[sectionKey]

    for (const { pixel, percent, dimension } of fields) {
      const size = getMetricSize(metrics, sectionKey, dimension)
      section[pixel] = percentToPixel(section?.[percent], size, section?.[pixel])
    }
  }

  return nextScene
}

export function stripLegacyPixelOffsets(scene) {
  const nextScene = cloneResponsiveScene(scene)

  for (const [sectionKey, fields] of Object.entries(RESPONSIVE_OFFSET_FIELDS)) {
    const section = nextScene[sectionKey]

    for (const { pixel, percent } of fields) {
      if (!hasFiniteNumber(section?.[percent])) {
        continue
      }

      delete section[pixel]
    }

    if (section.profiles?.[LEGACY_MOBILE_RESPONSIVE_PROFILE]) {
      delete section.profiles[LEGACY_MOBILE_RESPONSIVE_PROFILE]
    }
  }

  return nextScene
}

export function useElementSize(ref) {
  const [size, setSize] = useState(EMPTY_SIZE)

  useEffect(() => {
    const element = ref.current

    if (!element) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSize((current) =>
        current.width === 0 && current.height === 0 ? current : EMPTY_SIZE,
      )
      return undefined
    }

    const updateSize = () => {
      const rect = element.getBoundingClientRect()
      const nextSize = {
        width: rect.width,
        height: rect.height,
      }

      setSize((current) =>
        current.width === nextSize.width && current.height === nextSize.height
          ? current
          : nextSize,
      )
    }

    updateSize()

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => {
        updateSize()
      })

      observer.observe(element)

      return () => {
        observer.disconnect()
      }
    }

    window.addEventListener('resize', updateSize)

    return () => {
      window.removeEventListener('resize', updateSize)
    }
  }, [ref])

  return size
}
