import { useEffect } from 'react'
import SunyataLanding from './pages/SunyataLanding.jsx'
import FusionRoutePage from './pages/FusionRoutePage.jsx'
import StoryPage from './pages/StoryPage.jsx'
import AppDownloadPage from './pages/AppDownloadPage.jsx'
import YuanhuiUserGuidePage from './pages/YuanhuiUserGuidePage.jsx'
import AppFaqGuidePage from './pages/AppFaqGuidePage.jsx'
import LanguageToggle from './components/LanguageToggle.jsx'
import { SACRED_STORIES_BY_SLUG } from './content/sacredStories.js'
import { trackNavClick, trackPageView } from './lib/analytics.js'
import { detectDownloadPlatform } from './lib/downloadPlatform.js'

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
  const pathname = normalizePathname(window.location.pathname)
  const isDownloadPage =
    pathname === '/download' || pathname === '/download/yuanhui'
  const isYuanhuiGuidePage = pathname === '/guide/yuanhui'
  const isAppFaqGuidePage = pathname === '/guide/app-faq'

  useEffect(() => {
    trackPageView(
      isDownloadPage
        ? { scene: `app_download_${detectDownloadPlatform()}` }
        : isYuanhuiGuidePage
          ? { scene: 'yuanhui_user_guide' }
          : isAppFaqGuidePage
            ? { scene: 'app_faq_guide' }
        : undefined,
    )

    const handleNavClick = (event) => {
      const link = event.target.closest?.('nav a[href]')

      if (link) {
        trackNavClick(link.getAttribute('href'))
      }
    }

    document.addEventListener('click', handleNavClick, true)
    return () => document.removeEventListener('click', handleNavClick, true)
  }, [isAppFaqGuidePage, isDownloadPage, isYuanhuiGuidePage, pathname])

  if (FUSION_ROUTES.has(pathname)) {
    return <FusionRoutePage routePath={pathname} />
  }

  if (isDownloadPage) {
    return (
      <>
        <LanguageToggle />
        <AppDownloadPage />
      </>
    )
  }

  if (isYuanhuiGuidePage) {
    return (
      <>
        <LanguageToggle />
        <YuanhuiUserGuidePage />
      </>
    )
  }

  if (isAppFaqGuidePage) {
    return (
      <>
        <LanguageToggle />
        <AppFaqGuidePage />
      </>
    )
  }

  const params = new URLSearchParams(window.location.search)
  const storySlug = params.get('story')
  const story = storySlug ? SACRED_STORIES_BY_SLUG[storySlug] : null

  return story ? <StoryPage nav={STORY_NAV} story={story} /> : <SunyataLanding />
}

export default App
