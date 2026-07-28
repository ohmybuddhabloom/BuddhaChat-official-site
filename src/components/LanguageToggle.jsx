import { useEffect, useState } from 'react'

import { getChineseVariant, setChineseVariant } from '../lib/chineseVariant.js'

// Compact 简/繁 switch pinned to the top-right corner of every page.
// The labels stay untouched by the site-wide converter via data-no-convert.
export default function LanguageToggle() {
  const [variant, setVariant] = useState(() => getChineseVariant())

  useEffect(() => {
    // Keep unit-test DOM untouched; the module-level observer would otherwise
    // leak across renders within a shared jsdom environment.
    if (import.meta.env.MODE === 'test') return
    setChineseVariant(variant)
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
