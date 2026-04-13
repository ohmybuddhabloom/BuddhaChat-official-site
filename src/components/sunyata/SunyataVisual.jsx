import { useEffect, useState } from 'react'
import { resolveJournalImageSource } from '../../lib/journalAssetStore.js'

function SunyataVisual({
  sectionRef,
  ghostLabelRef,
  visual,
  quote,
  quoteThemeColor,
}) {
  const [resolvedImageSrc, setResolvedImageSrc] = useState(visual.imageSrc)

  useEffect(() => {
    let active = true
    let revoke = () => {}

    const hydrateImage = async () => {
      const resolved = await resolveJournalImageSource(visual.imageSrc)

      if (!active) {
        resolved.revoke()
        return
      }

      revoke = resolved.revoke
      setResolvedImageSrc(resolved.src)
    }

    hydrateImage()

    return () => {
      active = false
      revoke()
    }
  }, [visual.imageSrc])

  return (
    <section ref={sectionRef} className="visual-quote-section" id="vessels">
      <div className="visual-anchor">
        <div
          ref={ghostLabelRef}
          className="ghost-label"
          aria-hidden="true"
          style={{
            right: `${visual.ghostRight}%`,
            bottom: `${visual.ghostBottom}%`,
          }}
        >
          {visual.ghostLabel}
        </div>
        <img
          src={resolvedImageSrc}
          alt={visual.imageAlt}
          className="main-visual"
          style={{ width: `${visual.imageWidth}%` }}
        />
        <div
          className="quote-wrap visual-quote-wrap"
          id="silence"
          data-testid="visual-quote-overlay"
          style={{
            maxWidth: `${quote.maxWidth}px`,
            transform: `translate3d(${quote.x ?? 0}px, ${quote.y ?? 0}px, 0px)`,
            '--quote-bg-color': quoteThemeColor,
            '--quote-bg-opacity': `${(quote.backgroundOpacity ?? 20) / 100}`,
            '--quote-bg-blur': `${quote.backgroundBlur ?? 44}px`,
            '--quote-bg-padding': `${quote.backgroundPadding ?? 28}px`,
          }}
        >
          <p className="quote-copy">{quote.text}</p>

          <div className="quote-details">
            <div>
              <h4>{quote.studioLabel}</h4>
              <p>{quote.studioText}</p>
            </div>
            <div>
              <h4>{quote.philosophyLabel}</h4>
              <p>{quote.philosophyText}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SunyataVisual
