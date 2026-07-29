import { useEffect, useRef, useState } from 'react'

import { getChineseVariant, setChineseVariant } from '../lib/chineseVariant.js'

// Compact 简/繁 switch pinned to the top-right corner of every page.
// The labels stay untouched by the site-wide converter via data-no-convert.
export default function LanguageToggle() {
  const [variant, setVariant] = useState(() => getChineseVariant())
  const hasScheduledInitialVariant = useRef(false)

  useEffect(() => {
    // Keep unit-test DOM untouched; the module-level observer would otherwise
    // leak across renders within a shared jsdom environment.
    if (import.meta.env.MODE === 'test') return

    if (hasScheduledInitialVariant.current) {
      setChineseVariant(variant)
      return
    }

    hasScheduledInitialVariant.current = true
    const idleCallback = window.requestIdleCallback?.(
      () => setChineseVariant(variant),
      { timeout: 2500 },
    )
    const fallbackTimer = idleCallback === undefined
      ? window.setTimeout(() => setChineseVariant(variant), 1500)
      : null

    return () => {
      if (idleCallback !== undefined) {
        window.cancelIdleCallback?.(idleCallback)
      }
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer)
      }
    }
  }, [variant])

  return (
    <nav className="language-toggle" data-no-convert aria-label="简体繁体切换">
      <button
        type="button"
        className={variant === 'hans' ? 'is-active' : ''}
        aria-pressed={variant === 'hans'}
        onClick={() => setVariant('hans')}
      >
        简
      </button>
      <button
        type="button"
        className={variant === 'hant' ? 'is-active' : ''}
        aria-pressed={variant === 'hant'}
        onClick={() => setVariant('hant')}
      >
        繁
      </button>
    </nav>
  )
}
