// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const source = readFileSync(resolve(__dirname, '../../public/open-in-app.js'), 'utf8')
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; PYR110)'
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
const originalPush = history.pushState
const originalReplace = history.replaceState

// The script reads location and navigator as free variables, so a test hands it stand-ins.
function run(url, userAgent = IPHONE, extra = {}) {
  const parsed = new URL(url)
  const windowStub = { ...extra, addEventListener: vi.fn() }
  windowStub.top = extra.top ?? windowStub
  windowStub.self = windowStub
  new Function('window', 'location', 'navigator', 'history', 'sessionStorage', 'document', source)(
    windowStub,
    parsed,
    { userAgent, language: extra.language ?? 'zh-CN' },
    extra.history ?? history,
    sessionStorage,
    document,
  )
  return document.querySelector('[data-open-in-app]')
}

describe('open-in-app pill', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.documentElement.lang = ''
    sessionStorage.clear()
  })
  afterEach(() => {
    history.pushState = originalPush
    history.replaceState = originalReplace
  })

  it('links the exact current page through the production App Link host', () => {
    const page = 'https://www.buddhachat.online/sutra/read/heart?chapter=2'
    const link = run(page).querySelector('a')
    const target = new URL(link.href)
    expect(target.origin + target.pathname).toBe('https://go.buddhachat.online/l/page')
    expect(target.searchParams.get('url')).toBe(page)
    expect(link.textContent).toBe('在 App 中打开')
  })

  it('stays on Staging for the Staging site', () => {
    const link = run('https://staging.buddhachat.online/videos/').querySelector('a')
    expect(new URL(link.href).host).toBe('staging-admin.buddhachat.online')
  })

  it('shows on Android phones too', () => {
    expect(run('https://www.buddhachat.online/music/', ANDROID)).not.toBeNull()
  })

  it.each([
    ['desktop', 'https://www.buddhachat.online/videos/', DESKTOP, {}],
    ['inside the App', 'https://www.buddhachat.online/videos/', IPHONE, { ReactNativeWebView: { postMessage() {} } }],
    ['inside a frame', 'https://www.buddhachat.online/videos/', IPHONE, { top: {} }],
    ['an unknown host', 'https://outside.invalid/videos/', IPHONE, {}],
    ['a Staging host the App refuses', 'https://staging-yuanhui.buddhachat.online/', IPHONE, {}],
    ['a lookalike host', 'https://www.buddhachat.online.outside.invalid/', IPHONE, {}],
  ])('stays away on %s', (_name, url, userAgent, extra) => {
    expect(run(url, userAgent, extra)).toBeNull()
  })

  it.each([
    'https://www.buddhachat.online/login',
    'https://www.buddhachat.online/download',
    'https://www.buddhachat.online/videos/login',
    'https://www.buddhachat.online/app/onboarding/v1',
    'https://www.buddhachat.online/videos/?next=/x',
    'https://www.buddhachat.online/videos/?code=abc',
  ])('hides on %s, which the App would refuse', (url) => {
    expect(run(url).style.display).toBe('none')
  })

  it('follows single-page navigation', () => {
    const calls = []
    const fakeHistory = { pushState(...args) { calls.push(args) }, replaceState() {} }
    const parsed = new URL('https://www.buddhachat.online/videos/')
    const windowStub = { addEventListener: vi.fn() }
    windowStub.top = windowStub
    windowStub.self = windowStub
    new Function('window', 'location', 'navigator', 'history', 'sessionStorage', 'document', source)(
      windowStub, parsed, { userAgent: IPHONE, language: 'zh-CN' }, fakeHistory, sessionStorage, document,
    )
    const pill = document.querySelector('[data-open-in-app]')
    parsed.pathname = '/videos/video/abc'
    fakeHistory.pushState({}, '', '/videos/video/abc')
    expect(calls).toHaveLength(1)
    expect(new URL(pill.querySelector('a').href).searchParams.get('url')).toBe('https://www.buddhachat.online/videos/video/abc')
    parsed.pathname = '/login'
    fakeHistory.pushState({}, '', '/login')
    expect(pill.style.display).toBe('none')
  })

  it('stays dismissed for the session', () => {
    run('https://www.buddhachat.online/videos/').querySelector('button').click()
    expect(document.querySelector('[data-open-in-app]')).toBeNull()
    expect(run('https://www.buddhachat.online/videos/')).toBeNull()
  })

  it('uses the browser language, not the fixed language a page declares', () => {
    document.documentElement.lang = 'en'
    expect(run('https://www.buddhachat.online/videos/').querySelector('a').textContent).toBe('在 App 中打开')
    document.body.innerHTML = ''
    expect(run('https://www.buddhachat.online/videos/', IPHONE, { language: 'zh-TW' }).querySelector('a').textContent).toBe('在 App 中開啟')
    document.body.innerHTML = ''
    expect(run('https://www.buddhachat.online/videos/', IPHONE, { language: 'en-US' }).querySelector('a').textContent).toBe('Open in App')
  })
})
