import { useEffect } from 'react'
import SunyataLanding from './pages/SunyataLanding.jsx'
import FusionRoutePage from './pages/FusionRoutePage.jsx'
import StoryPage from './pages/StoryPage.jsx'
import { SACRED_STORIES_BY_SLUG } from './content/sacredStories.js'
import { trackNavClick, trackPageView } from './lib/analytics.js'

const STORY_NAV = {
  logo: 'Buddha Chat',
  links: [
    { label: 'The Path', href: '#path' },
    { label: 'The App', href: '#sanctuary' },
    { label: 'Proverb', href: '#vessels' },
    { label: 'Story', href: '#silence' },
    { label: 'Videos', href: '/videos' },
    { label: 'Sutra', href: '/sutra' },
    { label: 'Music', href: '/music' },
    { label: 'Sign in', href: '/login' },
  ],
}

const FUSION_ROUTES = new Set([
  '/videos',
  '/zentube',
  '/sutra',
  '/me',
  '/auth/login',
  '/login',
])

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') {
    return '/'
  }

  return pathname.replace(/\/+$/, '') || '/'
}

function App() {
  useEffect(() => {
    trackPageView()

    const handleNavClick = (event) => {
      const link = event.target.closest?.('nav a[href]')

      if (link) {
        trackNavClick(link.getAttribute('href'))
      }
    }

    document.addEventListener('click', handleNavClick, true)
    return () => document.removeEventListener('click', handleNavClick, true)
  }, [])

  const pathname = normalizePathname(window.location.pathname)

  if (FUSION_ROUTES.has(pathname)) {
    return <FusionRoutePage routePath={pathname} />
  }

  const params = new URLSearchParams(window.location.search)
  const storySlug = params.get('story')
  const story = storySlug ? SACRED_STORIES_BY_SLUG[storySlug] : null

  return story ? <StoryPage nav={STORY_NAV} story={story} /> : <SunyataLanding />
}

export default App
