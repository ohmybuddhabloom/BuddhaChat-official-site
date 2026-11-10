import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  SACRED_STORIES,
  SACRED_STORIES_BY_SLUG,
  getStoryHref,
} from '../content/sacredStories.js'

const TEXT_SWAP_DELAY = 280
const ANIMATION_LOCK_MS = 1800
const AUTOPLAY_DELAY = 5200


function resolveCurrentStorySlug(item, index) {
  if (item?.slug && SACRED_STORIES_BY_SLUG[item.slug]) {
    return item.slug
  }

  const safeFallbackSlug = SACRED_STORIES[index]?.slug ?? SACRED_STORIES[0]?.slug

  if (
    import.meta.env.DEV &&
    item?.slug &&
    !SACRED_STORIES_BY_SLUG[item.slug]
  ) {
    console.warn(
      `[SunyataWildernessJournal] Unknown story slug "${item.slug}" for card "${item.title}". Falling back to "${safeFallbackSlug}".`,
    )
  }

  return safeFallbackSlug
}

function WildernessCard({ item, index, isActive, state, style, onClick }) {
  return (
    <button
      type="button"
      className={`wilderness-card${isActive ? ' is-active' : ''}${
        state ? ` is-${state}` : ''
      }`}
      style={style}
      onClick={onClick}
      aria-label={`Open ${item.title}`}
      aria-pressed={isActive}
    >
      <div className="wilderness-card-frame">
        <img
          className="wilderness-card-image"
          src={`${item.card}-860.webp`}
          srcSet={`${item.card}-430.webp 430w, ${item.card}-860.webp 860w`}
          sizes="(max-width: 900px) 70vw, 430px"
          width="430"
          height="474"
          alt={item.title}
          loading="lazy"
          decoding="async"
        />
        <div className="wilderness-card-gradient" aria-hidden="true" />
        <div className="wilderness-card-copy">
          <span className="wilderness-card-number">{`0${index + 1}`}</span>
          <h3>{item.title}</h3>
        </div>
      </div>
    </button>
  )
}

// 山野手记：三个故事轮播。只在段落进入视口时自动轮换，滚出去就停（不在看不见的地方切图、做动画）。
function HomeJournal({ journal }) {
  const sectionRef = useRef(null)
  const [onScreen, setOnScreen] = useState(false)
  const categories = useMemo(() => journal.items ?? [], [journal.items])
  const totalCategories = categories.length
  const resolvedCategories = categories
  const [currentIndex, setCurrentIndex] = useState(0)
  const [displayIndex, setDisplayIndex] = useState(0)
  const [textVisible, setTextVisible] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)
  const currentIndexRef = useRef(0)
  const onScreenRef = useRef(false)
  const activateIndexRef = useRef(() => {})
  const swapTimerRef = useRef(0)
  const unlockTimerRef = useRef(0)
  const autoplayTimerRef = useRef(0)
  const safeCurrentIndex = totalCategories
    ? Math.min(currentIndex, totalCategories - 1)
    : 0
  const safeDisplayIndex = totalCategories
    ? Math.min(displayIndex, totalCategories - 1)
    : 0

  const currentCategory =
    resolvedCategories[safeDisplayIndex] ?? resolvedCategories[0]
  const currentStorySlug = resolveCurrentStorySlug(
    currentCategory,
    safeDisplayIndex,
  )

  useEffect(() => {
    currentIndexRef.current = safeCurrentIndex
  }, [safeCurrentIndex])

  const clearAnimationTimers = useCallback(() => {
    if (swapTimerRef.current) {
      window.clearTimeout(swapTimerRef.current)
    }

    if (unlockTimerRef.current) {
      window.clearTimeout(unlockTimerRef.current)
    }
  }, [])

  const scheduleAutoplay = useCallback(() => {
    if (autoplayTimerRef.current) {
      window.clearTimeout(autoplayTimerRef.current)
    }

    if (totalCategories <= 1 || !onScreenRef.current) {
      return
    }

    autoplayTimerRef.current = window.setTimeout(() => {
      activateIndexRef.current(currentIndexRef.current + 1)
    }, AUTOPLAY_DELAY)
  }, [totalCategories])

  const activateIndex = useCallback((nextIndex) => {
    if (!totalCategories) {
      return
    }

    const normalizedIndex =
      ((nextIndex % totalCategories) + totalCategories) % totalCategories

    if (normalizedIndex === currentIndexRef.current && !isAnimating) {
      scheduleAutoplay()
      return
    }

    clearAnimationTimers()
    setIsAnimating(true)
    setTextVisible(false)
    setCurrentIndex(normalizedIndex)
    currentIndexRef.current = normalizedIndex

    swapTimerRef.current = window.setTimeout(() => {
      setDisplayIndex(normalizedIndex)
      window.requestAnimationFrame(() => {
        setTextVisible(true)
      })
    }, TEXT_SWAP_DELAY)

    unlockTimerRef.current = window.setTimeout(() => {
      setIsAnimating(false)
    }, ANIMATION_LOCK_MS)

    scheduleAutoplay()
  }, [clearAnimationTimers, isAnimating, scheduleAutoplay, totalCategories])

  useEffect(() => {
    activateIndexRef.current = activateIndex
  }, [activateIndex])

  useEffect(() => {
    const section = sectionRef.current
    if (!section || typeof IntersectionObserver !== 'function') return undefined
    const observer = new IntersectionObserver(([entry]) => {
      onScreenRef.current = entry.isIntersecting
      setOnScreen(entry.isIntersecting)
    })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    scheduleAutoplay()

    return () => {
      clearAnimationTimers()

      if (autoplayTimerRef.current) {
        window.clearTimeout(autoplayTimerRef.current)
      }
    }
  }, [clearAnimationTimers, onScreen, scheduleAutoplay])

  const cardStyles = useMemo(() => {
    return resolvedCategories.map((_, index) => {
      const total = resolvedCategories.length

      // Transform / opacity use currentIndex (immediate start of animation)
      let diff = index - safeCurrentIndex
      while (diff < 0) {
        diff += total
      }

      // z-index uses displayIndex (delayed ~280ms) so transform starts before
      // z-order swaps, eliminating the instant z-layer pop / flash effect
      let zDiff = index - safeDisplayIndex
      while (zDiff < 0) {
        zDiff += total
      }
      const zIndex = zDiff === 0 ? 50 : zDiff === 1 ? 30 : zDiff === 2 ? 20 : 10

      if (diff === 0) {
        return {
          state: 'focus',
          transform: 'translate3d(-12px, -8px, 0px) scale(1.05)',
          opacity: 1,
          zIndex,
          filter: 'grayscale(0)',
          pointerEvents: 'auto',
        }
      }

      if (diff === 1) {
        return {
          state: 'glass',
          transform: 'translate3d(138px, 38px, 0px) scale(0.87)',
          opacity: 0.5,
          zIndex,
          filter: 'grayscale(0.35) saturate(0.82)',
          pointerEvents: 'auto',
        }
      }

      if (diff === 2) {
        return {
          state: 'glass',
          transform: 'translate3d(274px, 92px, 0px) scale(0.76)',
          opacity: 0.2,
          zIndex,
          filter: 'grayscale(0.62) saturate(0.72)',
          pointerEvents: 'auto',
        }
      }

      return {
        state: 'glass',
        transform: 'translate3d(308px, 108px, 0px) scale(0.62)',
        opacity: 0,
        zIndex,
        filter: 'grayscale(1)',
        pointerEvents: 'none',
      }
    })
  }, [resolvedCategories, safeCurrentIndex, safeDisplayIndex])

  const handleCardClick = (index) => {
    if (isAnimating) {
      return
    }

    if (index === safeCurrentIndex) {
      activateIndex(currentIndexRef.current + 1)
      return
    }

    activateIndex(index)
  }

  if (!currentCategory) {
    return null
  }

  return (
    <section
      ref={sectionRef}
      className="wilderness-journal-section"
      data-testid="wilderness-journal-section"
      aria-label="Wilderness Journal"
    >
      <div className="wilderness-backgrounds" aria-hidden="true">
        {resolvedCategories.map((item, index) => (
          <div
            key={item.title}
            className={`wilderness-background${
              index === safeCurrentIndex ? ' is-active' : ''
            }`}
          >
            <img
              src={`${item.background}-960.webp`}
              srcSet={`${item.background}-960.webp 960w, ${item.background}-${item.backgroundWide}.webp ${item.backgroundWide}w`}
              // 背景上叠着深色遮罩，手机上 960 宽足够：按 320 声明，三倍屏也只取 960 宽那张
              sizes="(max-width: 900px) 320px, 100vw"
              alt=""
              loading="lazy"
              decoding="async"
            />
          </div>
        ))}
      </div>

      <div className="wilderness-journal-surface" aria-hidden="true" />
      <div className="wilderness-gradient veil-left" aria-hidden="true" />
      <div className="wilderness-gradient veil-bottom" aria-hidden="true" />

      <div className="wilderness-body">
        <div
          className="wilderness-copy"
          data-testid="journal-copy-block"
        >
          <span className={`wilderness-tag${textVisible ? ' is-visible' : ''}`}>
            {currentCategory.tag}
          </span>
          <h2 className={`wilderness-title${textVisible ? ' is-visible' : ''}`}>
            {currentCategory.title}
          </h2>
          <p
            className={`wilderness-description${
              textVisible ? ' is-visible' : ''
            }`}
          >
            {currentCategory.description}
          </p>

          <div className="wilderness-actions">
            <a
              className="wilderness-cta"
              href={getStoryHref(currentStorySlug)}
            >
              {journal.actionLabel}
            </a>
            <span className="wilderness-rule" aria-hidden="true" />
          </div>
        </div>

        <div
          className="wilderness-carousel-wrap"
          data-testid="journal-media-block"
        >
          <div className="wilderness-media-stack">
            <div className="wilderness-carousel">
              {resolvedCategories.map((item, index) => (
                <WildernessCard
                  key={item.title}
                  item={item}
                  index={index}
                  isActive={index === safeCurrentIndex}
                  state={cardStyles[index].state}
                  style={cardStyles[index]}
                  onClick={() => handleCardClick(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HomeJournal
