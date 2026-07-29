import { lazy, Suspense, useEffect } from 'react'
import LanguageToggle from './components/LanguageToggle.jsx'
import { trackNavClick, trackPageView } from './lib/analytics.js'
import { detectDownloadPlatform } from './lib/downloadPlatform.js'

const SunyataLanding = lazy(() => import('./pages/SunyataLanding.jsx'))
const FusionRoutePage = lazy(() => import('./pages/FusionRoutePage.jsx'))
const StoryRoutePage = lazy(() => import('./pages/StoryRoutePage.jsx'))
const AppDownloadPage = lazy(() => import('./pages/AppDownloadPage.jsx'))
const YuanhuiUserGuidePage = lazy(() => import('./pages/YuanhuiUserGuidePage.jsx'))
const AppFaqGuidePage = lazy(() => import('./pages/AppFaqGuidePage.jsx'))

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
    const scene = isDownloadPage
      ? { scene: `app_download_${detectDownloadPlatform()}` }
      : isYuanhuiGuidePage
        ? { scene: 'yuanhui_user_guide' }
        : isAppFaqGuidePage
          ? { scene: 'app_faq_guide' }
          : undefined
    const idleCallback = window.requestIdleCallback?.(
      () => trackPageView(scene),
      { timeout: 2500 },
    )
    const fallbackTimer = idleCallback === undefined
      ? window.setTimeout(() => trackPageView(scene), 1500)
      : null

    const handleNavClick = (event) => {
      const link = event.target.closest?.('nav a[href]')

      if (link) {
        trackNavClick(link.getAttribute('href'))
      }
    }

    document.addEventListener('click', handleNavClick, true)
    return () => {
      document.removeEventListener('click', handleNavClick, true)
      if (idleCallback !== undefined) {
        window.cancelIdleCallback?.(idleCallback)
      }
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer)
      }
    }
  }, [isAppFaqGuidePage, isDownloadPage, isYuanhuiGuidePage, pathname])

  if (FUSION_ROUTES.has(pathname)) {
    return (
      <Suspense fallback={null}>
        <FusionRoutePage routePath={pathname} />
      </Suspense>
    )
  }

  if (isDownloadPage) {
    return (
      <Suspense fallback={null}>
        <LanguageToggle />
        <AppDownloadPage />
      </Suspense>
    )
  }

  if (isYuanhuiGuidePage) {
    return (
      <Suspense fallback={null}>
        <LanguageToggle />
        <YuanhuiUserGuidePage />
      </Suspense>
    )
  }

  if (isAppFaqGuidePage) {
    return (
      <Suspense fallback={null}>
        <LanguageToggle />
        <AppFaqGuidePage />
      </Suspense>
    )
  }

  const params = new URLSearchParams(window.location.search)
  const storySlug = params.get('story')

  return (
    <Suspense fallback={null}>
      {storySlug
        ? <StoryRoutePage nav={STORY_NAV} storySlug={storySlug} />
        : <SunyataLanding />}
    </Suspense>
  )
}

export default App
