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
              >
                <button
                  type="button"
                  className="sunyata-story-trigger"
                  aria-haspopup="menu"
                  aria-label="Open story menu"
                >
                  {item.label || 'Story'}
                </button>
                <div className="sunyata-story-menu-panel">
                  {stories.map((story) => (
                    <a
                      key={story.slug}
                      href={getStoryHref(story.slug)}
                      className={
                        story.slug === currentStorySlug ? 'is-active' : ''
                      }
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
