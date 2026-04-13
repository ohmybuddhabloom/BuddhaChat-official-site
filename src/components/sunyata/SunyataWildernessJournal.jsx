import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resolveJournalImageSource } from '../../lib/journalAssetStore.js'

const TEXT_SWAP_DELAY = 220
const ANIMATION_LOCK_MS = 1120
const AUTOPLAY_DELAY = 4600

function splitTitle(title) {
  if (!title.includes(' ')) {
    return title
  }

  return title.split(' ').map((word, index, words) => (
    <span key={`${word}-${index}`}>
      {word}
      {index < words.length - 1 ? <br /> : null}
    </span>
  ))
}

function WildernessCard({ item, index, isActive, style, onClick }) {
  return (
    <button
      type="button"
      className={`wilderness-card${isActive ? ' is-active' : ''}`}
      style={style}
      onClick={onClick}
      aria-label={`Open ${item.title}`}
      aria-pressed={isActive}
    >
      <div className="wilderness-card-frame">
        <img
          className="wilderness-card-image"
          src={item.cardUrl}
          alt={item.title}
          loading="lazy"
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

function SunyataWildernessJournal({ journal }) {
  const categories = useMemo(() => journal.items ?? [], [journal.items])
  const totalCategories = categories.length
  const [resolvedCategories, setResolvedCategories] = useState(categories)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [displayIndex, setDisplayIndex] = useState(0)
  const [textVisible, setTextVisible] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)
  const currentIndexRef = useRef(0)
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

  useEffect(() => {
    let active = true
    const revokes = []

    const hydrateImages = async () => {
      const nextCategories = await Promise.all(
        categories.map(async (item) => {
          const [cardAsset, backgroundAsset] = await Promise.all([
            resolveJournalImageSource(item.cardUrl),
            resolveJournalImageSource(item.backgroundUrl),
          ])

          revokes.push(cardAsset.revoke, backgroundAsset.revoke)

          return {
            ...item,
            cardUrl: cardAsset.src || item.cardUrl,
            backgroundUrl: backgroundAsset.src || item.backgroundUrl,
          }
        }),
      )

      if (!active) {
        return
      }

      setResolvedCategories(nextCategories)
    }

    hydrateImages()

    return () => {
      active = false
      revokes.forEach((revoke) => revoke?.())
    }
  }, [categories])

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

    if (totalCategories <= 1) {
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
    scheduleAutoplay()

    return () => {
      clearAnimationTimers()

      if (autoplayTimerRef.current) {
        window.clearTimeout(autoplayTimerRef.current)
      }
    }
  }, [clearAnimationTimers, scheduleAutoplay])

  const cardStyles = useMemo(() => {
    return resolvedCategories.map((_, index) => {
      const total = resolvedCategories.length
      let diff = index - safeCurrentIndex

      while (diff < 0) {
        diff += total
      }

      if (diff === 0) {
        return {
          transform: 'translate3d(0px, 0px, 0px) scale(1)',
          opacity: 1,
          zIndex: 40,
          filter: 'grayscale(0)',
          pointerEvents: 'auto',
        }
      }

      if (diff === 1) {
        return {
          transform: 'translate3d(118px, 34px, 0px) scale(0.88)',
          opacity: 0.68,
          zIndex: 30,
          filter: 'grayscale(0.24)',
          pointerEvents: 'auto',
        }
      }

      if (diff === 2) {
        return {
          transform: 'translate3d(228px, 78px, 0px) scale(0.74)',
          opacity: 0.26,
          zIndex: 20,
          filter: 'grayscale(0.58)',
          pointerEvents: 'auto',
        }
      }

      return {
        transform: 'translate3d(308px, 108px, 0px) scale(0.62)',
        opacity: 0,
        zIndex: 10,
        filter: 'grayscale(1)',
        pointerEvents: 'none',
      }
    })
  }, [resolvedCategories, safeCurrentIndex])

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
      className="wilderness-journal-section"
      data-testid="wilderness-journal-section"
      aria-label="Wilderness Journal"
      style={{
        '--journal-bg': journal.theme.base,
        '--journal-overlay-color': journal.theme.overlayColor ?? journal.theme.base,
        '--journal-gold': journal.theme.accent,
        '--journal-cream': journal.theme.text,
        '--journal-overlay-opacity': `${(journal.theme.overlayOpacity ?? 72) / 100}`,
        '--journal-image-opacity': `${(journal.theme.imageOpacity ?? 34) / 100}`,
        '--journal-left-veil-opacity': `${(journal.theme.leftVeilOpacity ?? 98) / 100}`,
        '--journal-bottom-veil-opacity': `${(journal.theme.bottomVeilOpacity ?? 84) / 100}`,
        '--journal-glow-opacity': `${(journal.theme.ambientGlowOpacity ?? 16) / 100}`,
        '--journal-copy-max-width': `${journal.theme.copyMaxWidth ?? 560}px`,
        '--journal-card-width': `${journal.theme.cardWidth ?? 340}px`,
        '--journal-card-height': `${journal.theme.cardHeight ?? 460}px`,
      }}
    >
      <div className="wilderness-backgrounds" aria-hidden="true">
        {resolvedCategories.map((item, index) => (
          <div
            key={item.title}
            className={`wilderness-background${
              index === safeCurrentIndex ? ' is-active' : ''
            }`}
            style={{ backgroundImage: `url('${item.backgroundUrl}')` }}
          />
        ))}
      </div>

      <div className="wilderness-journal-surface" aria-hidden="true" />
      <div className="wilderness-gradient veil-left" aria-hidden="true" />
      <div className="wilderness-gradient veil-bottom" aria-hidden="true" />

      <div className="wilderness-body">
        <div
          className="wilderness-copy"
          data-testid="journal-copy-block"
          style={{
            transform: `translate3d(${journal.textX ?? 0}px, ${journal.textY ?? 0}px, 0px)`,
          }}
        >
          <span className={`wilderness-tag${textVisible ? ' is-visible' : ''}`}>
            {currentCategory.tag}
          </span>
          <h2 className={`wilderness-title${textVisible ? ' is-visible' : ''}`}>
            {splitTitle(currentCategory.title)}
          </h2>
          <p
            className={`wilderness-description${
              textVisible ? ' is-visible' : ''
            }`}
          >
            {currentCategory.description}
          </p>

          <div className="wilderness-actions">
            <button type="button" className="wilderness-cta">
              {journal.actionLabel}
            </button>
            <span className="wilderness-rule" aria-hidden="true" />
          </div>
        </div>

        <div
          className="wilderness-carousel-wrap"
          data-testid="journal-media-block"
          style={{
            transform: `translate3d(${journal.imageX ?? 0}px, ${journal.imageY ?? 0}px, 0px)`,
          }}
        >
          <div className="wilderness-media-stack">
            <div className="wilderness-carousel">
              {resolvedCategories.map((item, index) => (
                <WildernessCard
                  key={item.title}
                  item={item}
                  index={index}
                  isActive={index === safeCurrentIndex}
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

export default SunyataWildernessJournal
