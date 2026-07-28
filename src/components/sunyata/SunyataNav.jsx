import { useEffect, useId, useRef, useState } from 'react'
import { SACRED_STORIES, getStoryHref } from '../../content/sacredStories.js'

function resolveNavHref(href, currentStorySlug) {
  if (!href) {
    return '/'
  }

  if (currentStorySlug && href.startsWith('#')) {
    return `/${href}`
  }

  if (href === '/login' || href === '/auth/login') {
    const login = new URL('https://www.buddhachat.online/videos/auth/login')
    login.searchParams.set(
      'returnUrl',
      currentStorySlug
        ? `https://www.buddhachat.online/?story=${encodeURIComponent(currentStorySlug)}`
        : 'https://www.buddhachat.online/',
    )
    return login.toString()
  }

  return href
}

function SunyataNav({ nav, stories = SACRED_STORIES, currentStorySlug = null }) {
  const [storyMenuOpen, setStoryMenuOpen] = useState(false)
  const storyMenuId = useId()
  const storyMenuRef = useRef(null)
  const storyTriggerRef = useRef(null)

  useEffect(() => {
    if (!storyMenuOpen) return undefined
    const closeOutside = (event) => {
      if (!storyMenuRef.current?.contains(event.target)) setStoryMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [storyMenuOpen])

  return (
    <nav className="sunyata-nav" aria-label="Primary">
      <div className="sunyata-logo">{nav.logo}</div>
      <div className="sunyata-nav-links">
        {nav.links.map((item, index) => {
          const isStoryMenu = item.label?.trim().toLowerCase() === 'story'

          if (isStoryMenu) {
            return (
              <div
                key={`${item.label}-${index}`}
                className={`sunyata-story-menu${
                  currentStorySlug ? ' is-active' : ''
                }`}
                onKeyDown={(event) => {
                  if (event.key !== 'Escape' || !storyMenuOpen) return
                  event.preventDefault()
                  setStoryMenuOpen(false)
                  storyTriggerRef.current?.focus()
                }}
                ref={storyMenuRef}
              >
                <button
                  type="button"
                  className="sunyata-story-trigger"
                  aria-controls={storyMenuId}
                  aria-expanded={storyMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Open story menu"
                  onClick={() => setStoryMenuOpen((open) => !open)}
                  ref={storyTriggerRef}
                >
                  {item.label || 'Story'}
                </button>
                <div
                  className={`sunyata-story-menu-panel${storyMenuOpen ? ' is-open' : ''}`}
                  hidden={!storyMenuOpen}
                  id={storyMenuId}
                  role="menu"
                >
                  {stories.map((story) => (
                    <a
                      key={story.slug}
                      href={getStoryHref(story.slug)}
                      className={
                        story.slug === currentStorySlug ? 'is-active' : ''
                      }
                      onClick={() => setStoryMenuOpen(false)}
                      role="menuitem"
                    >
                      <span>{story.kicker}</span>
                      <strong>{story.shortTitle}</strong>
                    </a>
                  ))}
                </div>
              </div>
            )
          }

          return (
            <a key={item.label} href={resolveNavHref(item.href, currentStorySlug)}>
              {item.label}
            </a>
          )
        })}
      </div>
    </nav>
  )
}

export default SunyataNav
