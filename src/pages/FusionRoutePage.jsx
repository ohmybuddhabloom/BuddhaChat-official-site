import { useEffect, useState } from 'react'
import {
  buildAuthReturnUrl,
  fetchZentubeSession,
  getZentubeOrigin,
  logoutZentube,
} from '../lib/fusionAuth.js'

const DEFAULT_SUTRA_ORIGIN = 'https://www.buddhachat.online/sutra'

function getSutraOrigin() {
  return (import.meta.env.VITE_SUTRA_ORIGIN || DEFAULT_SUTRA_ORIGIN).replace(/\/+$/, '')
}

function getZentubeHomeHref() {
  return getZentubeOrigin().replace(/\/+$/, '')
}

const ROUTE_CONFIG = {
  '/videos': {
    eyebrow: 'Unified Video',
    title: 'Master talks stay online while www becomes the front door.',
    lead:
      'This www path is the official video front door. The existing Zentube deployment stays online while account APIs move behind the same www origin.',
    primaryLabel: 'Open existing video site',
    primaryHref: getZentubeHomeHref,
    secondaryLabel: 'Sign in first',
    secondaryHref: '/auth/login?returnUrl=/videos',
    status: 'Safe link mode',
    next:
      'Next phase: reverse proxy or API bridge after parent-domain session cookies are verified.',
  },
  '/zentube': {
    eyebrow: 'Unified Video',
    title: 'Master talks stay online while www becomes the front door.',
    lead:
      'This compatibility route maps the Zentube name to the same safe video entry, keeping the existing deployment intact before any proxy or domain cutover.',
    primaryLabel: 'Open existing video site',
    primaryHref: getZentubeHomeHref,
    secondaryLabel: 'Sign in first',
    secondaryHref: '/auth/login?returnUrl=/zentube',
    status: 'Compatibility route',
    next:
      'Next phase: keep /videos as the product route and decide whether /zentube remains as a legacy alias.',
  },
  '/sutra': {
    eyebrow: 'Scripture Reader',
    title: 'The sutra reader remains independent while account sync is added.',
    lead:
      'This www path is the official reader front door. The current 4467-book reader stays online while reading data sync is routed through the www account bridge.',
    primaryLabel: 'Open existing reader',
    primaryHref: getSutraOrigin,
    secondaryLabel: 'View account area',
    secondaryHref: '/me',
    status: 'Safe link mode',
    next:
      'Next phase: add reader sync APIs after authenticated user identity is available on www.',
  },
  '/auth/login': {
    eyebrow: 'Shared Account',
    title: 'Sign in once for video and scripture reading.',
    lead:
      'The account source-of-truth remains Zentube, but this www page talks to the same auth API through same-origin routes.',
    primaryLabel: 'Continue to Zentube login',
    primaryHref: '/auth/login',
    secondaryLabel: 'Back to home',
    secondaryHref: '/',
    status: 'Same-origin auth',
    next:
      'This path avoids new DNS and lets the official site verify the active account before reader sync.',
  },
  '/login': {
    eyebrow: 'Shared Account',
    title: 'Sign in once for video and scripture reading.',
    lead:
      'The account source-of-truth remains Zentube, but this www page talks to the same auth API through same-origin routes.',
    primaryLabel: 'Continue to Zentube login',
    primaryHref: '/login',
    secondaryLabel: 'Back to home',
    secondaryHref: '/',
    status: 'Same-origin auth',
    next:
      'This path avoids new DNS and lets the official site verify the active account before reader sync.',
  },
  '/me': {
    eyebrow: 'Account Hub',
    title: 'One profile should collect video history and reading data.',
    lead:
      'This account hub is intentionally read-only in the preview shell until the shared session and reader sync tables are verified.',
    primaryLabel: 'Sign in',
    primaryHref: '/auth/login?returnUrl=/me',
    secondaryLabel: 'Open reader',
    secondaryHref: '/sutra',
    status: 'Data sync pending',
    next:
      'Next phase: merge local reader state into account data after explicit user confirmation.',
  },
}

const PLATFORM_LINKS = [
  {
    label: 'Official site',
    href: '/',
    description: 'Brand, story, product context, and conversion entry.',
  },
  {
    label: 'Videos',
    href: '/videos',
    description: 'Zentube content and the existing login source.',
  },
  {
    label: 'Sutra',
    href: '/sutra',
    description: 'Reader, scripture catalog, explanations, and audio.',
  },
  {
    label: 'Account',
    href: '/me',
    description: 'Future home for shared user state and data controls.',
  },
]

const SAFETY_ITEMS = [
  'Existing video and sutra subdomains remain untouched.',
  'No new preview subdomain or GoDaddy DNS record is required for this path-based slice.',
  'Secrets, cookies, signed media URLs, and service keys stay out of the browser bundle.',
]

function getReturnUrl() {
  if (typeof window === 'undefined') {
    return 'https://www.buddhachat.online/'
  }

  const returnPath = new URLSearchParams(window.location.search).get('returnUrl') || '/'
  return buildAuthReturnUrl(returnPath)
}

function buildZentubeLoginHref(returnUrl) {
  const loginUrl = new URL(`${getZentubeHomeHref()}/auth/login`)
  loginUrl.searchParams.set('returnUrl', returnUrl)
  return loginUrl.toString()
}

const SESSION_COPY = {
  checking: {
    label: 'Session bridge',
    value: 'Checking shared login state.',
  },
  authenticated: {
    label: 'Signed in',
    value: 'Zentube session is visible from the unified www shell.',
  },
  anonymous: {
    label: 'Signed out',
    value: 'Reader data will stay local until account sync is connected.',
  },
  unavailable: {
    label: 'Bridge pending',
    value: 'Session API needs shared cookie and credential CORS configuration.',
  },
}

function useSessionBridge() {
  const [session, setSession] = useState({
    status: 'checking',
    authenticated: false,
    user: null,
  })

  useEffect(() => {
    let cancelled = false

    fetchZentubeSession().then((nextSession) => {
      if (!cancelled) {
        setSession(nextSession)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  return session
}

function SameOriginAccountPanel({ navigate, session }) {
  const [logoutStatus, setLogoutStatus] = useState('idle')

  async function handleLogout() {
    setLogoutStatus('submitting')

    try {
      await logoutZentube()
      navigate('/login')
    } catch {
      setLogoutStatus('error')
    }
  }

  if (session.status === 'checking') {
    return <p className="fusion-muted">Checking account state...</p>
  }

  if (!session.authenticated) {
    return (
      <div className="fusion-account-actions">
        <p className="fusion-muted">No active account is visible from www.</p>
        <a className="fusion-action-primary" href="/login?returnUrl=/me">
          Sign in
        </a>
      </div>
    )
  }

  return (
    <div className="fusion-account-actions">
      <dl className="fusion-account-list">
        <div>
          <dt>Name</dt>
          <dd>{session.user?.displayName || session.user?.username || 'Signed in user'}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{session.user?.email || 'Hidden'}</dd>
        </div>
      </dl>
      <button
        className="fusion-action-secondary"
        disabled={logoutStatus === 'submitting'}
        onClick={handleLogout}
        type="button"
      >
        {logoutStatus === 'submitting' ? 'Signing out...' : 'Sign out'}
      </button>
      {logoutStatus === 'error' ? <p className="fusion-login-message is-error">Sign out failed.</p> : null}
    </div>
  )
}

function ExternalRedirectPage({ eyebrow, href, label, title }) {
  return (
    <main className="fusion-page fusion-redirect-page">
      <meta httpEquiv="refresh" content={`0; url=${href}`} />
      <div className="fusion-bg" aria-hidden="true" />
      <section className="fusion-hero" aria-labelledby="fusion-title">
        <div className="fusion-copy">
          <span className="fusion-eyebrow">{eyebrow}</span>
          <h1 id="fusion-title">{title}</h1>
          <p>Taking you to the existing BuddhaChat experience.</p>
          <div className="fusion-actions">
            <a className="fusion-action-primary" href={href}>
              {label}
            </a>
            <a className="fusion-action-secondary" href="/">
              Back to official site
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}

function FusionRoutePage({ navigate = (href) => window.location.assign(href), routePath }) {
  const config = ROUTE_CONFIG[routePath] ?? ROUTE_CONFIG['/videos']
  const session = useSessionBridge()
  const sessionCopy = SESSION_COPY[session.status] ?? SESSION_COPY.unavailable
  const returnUrl = getReturnUrl()
  const redirectHrefByRoute = {
    '/videos': getZentubeHomeHref(),
    '/zentube': getZentubeHomeHref(),
    '/sutra': getSutraOrigin(),
    '/auth/login': buildZentubeLoginHref(returnUrl),
    '/login': buildZentubeLoginHref(returnUrl),
  }
  const redirectHref = redirectHrefByRoute[routePath]

  if (redirectHref) {
    return (
      <ExternalRedirectPage
        eyebrow={config.eyebrow}
        href={redirectHref}
        label={config.primaryLabel}
        title={config.title}
      />
    )
  }

  const configuredPrimaryHref =
    typeof config.primaryHref === 'function' ? config.primaryHref() : config.primaryHref
  const primaryHref =
    routePath === '/auth/login'
      ? `${configuredPrimaryHref}?returnUrl=${encodeURIComponent(returnUrl)}`
      : configuredPrimaryHref

  return (
    <main className="fusion-page">
      <div className="fusion-bg" aria-hidden="true" />
      <nav className="fusion-nav" aria-label="BuddhaChat unified navigation">
        <a className="fusion-brand" href="/">
          BuddhaChat
        </a>
        <div className="fusion-nav-links">
          <a href="/videos">Videos</a>
          <a href="/sutra">Sutra</a>
          <a href="/me">Account</a>
          {routePath === '/me' ? null : <a href="/login">Sign in</a>}
        </div>
      </nav>

      <section className="fusion-hero" aria-labelledby="fusion-title">
        <div className="fusion-copy">
          <span className="fusion-eyebrow">{config.eyebrow}</span>
          <h1 id="fusion-title">{config.title}</h1>
          <p>{config.lead}</p>
          {routePath === '/me' ? null : (
            <div className="fusion-actions">
              <a className="fusion-action-primary" href={primaryHref}>
                {config.primaryLabel}
              </a>
              <a className="fusion-action-secondary" href={config.secondaryHref}>
                {config.secondaryLabel}
              </a>
            </div>
          )}
        </div>

        <aside className="fusion-status-panel" aria-label="Integration status">
          <span>{config.status}</span>
          <strong>{config.next}</strong>
          <div className="fusion-session" data-state={session.status}>
            <span>{sessionCopy.label}</span>
            <strong>{sessionCopy.value}</strong>
            {session.user ? (
              <small>
                {session.user.displayName || session.user.username || session.user.email}
              </small>
            ) : null}
          </div>
        </aside>
      </section>

      {routePath === '/me' ? (
        <section className="fusion-safety" aria-label="Account details">
          <h2>Account state</h2>
          <SameOriginAccountPanel navigate={navigate} session={session} />
        </section>
      ) : null}

      <section className="fusion-grid" aria-label="Unified platform map">
        {PLATFORM_LINKS.map((item) => (
          <a className="fusion-link-tile" href={item.href} key={item.href}>
            <span>{item.label}</span>
            <p>{item.description}</p>
          </a>
        ))}
      </section>

      <section className="fusion-safety" aria-label="Preview safety boundaries">
        <h2>Preview safety boundary</h2>
        <ul>
          {SAFETY_ITEMS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default FusionRoutePage
