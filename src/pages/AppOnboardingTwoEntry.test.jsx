// 1.3.8: the embedded welcome offers only "直接体验" and "已有账号？登录" (1.3.5 auth wireframe ①).
// This page is served live to App 1.3.7, so every message it sends must be one 1.3.7 accepts.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppOnboardingWelcomePage from './AppOnboardingWelcomePage.jsx'

const bridgeMessages = (postMessage) => postMessage.mock.calls.map(([message]) => JSON.parse(message))
const sendNativeMessage = (message) => window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) }))

// Copied from App 1.3.7 (main) src/services/onboardingH5Bridge.ts. Do not widen these to make a test
// pass: 1.3.7 users keep this exact App while the H5 page changes under them.
const APP_137_EVENTS = new Set([
  'bridge.ready', 'auth.email.send_otp', 'auth.email.verify_otp', 'auth.sign_in', 'guest.explore', 'onboarding.persist',
  'guardian.resolve', 'navigation.open', 'onboarding.complete', 'onboarding.step_ready', 'navigation.external',
])
const APP_137_PERSIST_PREDECESSORS = {
  welcome: ['', 'welcome', 'email', 'quests'],
  email: ['', 'welcome', 'email'],
  quests: ['', 'welcome', 'email', 'quests', 'wish_survey_1'],
}

function mount(capabilities, locale = 'zh-Hans') {
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  const postMessage = vi.fn()
  window.ReactNativeWebView = { postMessage }
  window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
  render(<AppOnboardingWelcomePage />)
  const ready = bridgeMessages(postMessage)[0]
  act(() => sendNativeMessage({
    v: 1, type: 'bootstrap', event: 'bridge.bootstrap', id: ready.id,
    payload: { initialStep: 'welcome', payload: {}, locale, capabilities },
  }))
  return postMessage
}

const ack = (message) => act(async () => sendNativeMessage({ v: 1, type: 'ack', event: message.event, id: message.id, payload: {} }))
const lastPersist = (postMessage) => bridgeMessages(postMessage).filter(({ event }) => event === 'onboarding.persist').at(-1)

// Replays every persist against the 1.3.7 transition rules, starting from the native welcome step.
function expectAcceptedBy137(postMessage) {
  let current = 'welcome'
  for (const message of bridgeMessages(postMessage)) {
    expect(APP_137_EVENTS.has(message.event), message.event).toBe(true)
    if (message.event !== 'onboarding.persist') continue
    const allowed = APP_137_PERSIST_PREDECESSORS[message.payload.step]
    expect(allowed, `persist step ${message.payload.step}`).toBeDefined()
    expect(allowed, `${current} -> ${message.payload.step}`).toContain(current)
    current = message.payload.step
  }
}

const ALL = { emailOtp: true, appleSignIn: true, googleSignIn: true, guest: true }

describe('embedded two-entry welcome', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete window.ReactNativeWebView
    window.history.replaceState({}, '', '/app/onboarding/v1')
  })

  it('shows only "直接体验" and "已有账号？登录" on the first screen', () => {
    mount(ALL)
    expect(screen.getByRole('button', { name: '直接体验' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '已有账号？登录' })).toBeInTheDocument()
    for (const name of ['使用邮箱继续', '使用 Apple 继续', '使用 Google 继续', '游客体验', '开始探索']) {
      expect(screen.queryByRole('button', { name }), name).not.toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: '服务条款' })).toBeInTheDocument()
  })

  it('"直接体验" enters as a guest through the message 1.3.7 already handles', async () => {
    const postMessage = mount(ALL)
    const direct = screen.getByRole('button', { name: '直接体验' })
    fireEvent.click(direct)
    fireEvent.click(direct)
    const guest = bridgeMessages(postMessage).filter(({ event }) => event === 'guest.explore')
    expect(guest).toHaveLength(1)
    expect(guest[0].payload).toEqual({})
    await ack(guest[0])
    expectAcceptedBy137(postMessage)
  })

  it('opens the sign-in choices without telling the App anything, with Apple only when the App offers it', () => {
    const iphone = mount(ALL)
    const before = iphone.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: '已有账号？登录' }))
    expect(iphone.mock.calls.length, 'opening the choices is H5-only').toBe(before)
    expect(screen.getByRole('heading', { name: '登录或注册账号' })).toBeInTheDocument()
    for (const name of ['使用邮箱继续', '使用 Apple 继续', '使用 Google 继续']) expect(screen.getByRole('button', { name })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '直接体验' })).not.toBeInTheDocument()
  })

  it('hides Apple on the sign-in choices for Android', () => {
    mount({ emailOtp: true, appleSignIn: false, googleSignIn: true, guest: true })
    fireEvent.click(screen.getByRole('button', { name: '已有账号？登录' }))
    expect(screen.queryByRole('button', { name: '使用 Apple 继续' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '使用 Google 继续' })).toBeInTheDocument()
  })

  it('signs in from the choices exactly as the old welcome did', async () => {
    const postMessage = mount(ALL)
    fireEvent.click(screen.getByRole('button', { name: '已有账号？登录' }))
    const google = screen.getByRole('button', { name: '使用 Google 继续' })
    fireEvent.click(google)
    fireEvent.click(google)
    const auth = bridgeMessages(postMessage).filter(({ event }) => event === 'auth.sign_in')
    expect(auth).toHaveLength(1)
    expect(auth[0].payload).toEqual({ provider: 'google' })
    await ack(auth[0])
    const progress = lastPersist(postMessage)
    expect(progress.payload).toEqual({ step: 'quests', data: {} })
    await ack(progress)
    expect(screen.getByRole('heading', { name: /你的清净之路/ })).toBeInTheDocument()
    expectAcceptedBy137(postMessage)
  })

  it('a cancelled sign-in stays quietly on the choices', async () => {
    const postMessage = mount(ALL)
    fireEvent.click(screen.getByRole('button', { name: '已有账号？登录' }))
    fireEvent.click(screen.getByRole('button', { name: '使用 Apple 继续' }))
    const auth = bridgeMessages(postMessage).find(({ event }) => event === 'auth.sign_in')
    await act(async () => sendNativeMessage({ v: 1, type: 'error', event: auth.event, id: auth.id, payload: { code: 'auth_cancelled', message: '登录已取消', retryable: false } }))
    expect(screen.getByRole('heading', { name: '登录或注册账号' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('back from the choices (button or Android back) returns to the first screen with a step 1.3.7 accepts', async () => {
    for (const viaNative of [false, true]) {
      const postMessage = mount(ALL)
      fireEvent.click(screen.getByRole('button', { name: '已有账号？登录' }))
      if (viaNative) act(() => window.dispatchEvent(new Event('buddhachat:native-back')))
      else fireEvent.click(screen.getByRole('button', { name: '返回' }))
      const back = lastPersist(postMessage)
      expect(back.payload.step).toBe('welcome')
      await ack(back)
      expect(screen.getByRole('button', { name: '直接体验' })).toBeInTheDocument()
      expectAcceptedBy137(postMessage)
      document.body.innerHTML = ''
    }
  })

  it('email opened from the choices goes back to the choices, never sending an unknown step', async () => {
    const postMessage = mount(ALL)
    fireEvent.click(screen.getByRole('button', { name: '已有账号？登录' }))
    fireEvent.click(screen.getByRole('button', { name: '使用邮箱继续' }))
    const open = lastPersist(postMessage)
    expect(open.payload).toEqual({ step: 'email', data: {} })
    await ack(open)
    expect(screen.getByRole('heading', { name: '使用邮箱继续' })).toBeInTheDocument()
    act(() => window.dispatchEvent(new Event('buddhachat:native-back')))
    const back = lastPersist(postMessage)
    expect(back.payload.step).toBe('welcome')
    await ack(back)
    expect(screen.getByRole('heading', { name: '登录或注册账号' })).toBeInTheDocument()
    expectAcceptedBy137(postMessage)
  })

  it('hides an entry the App cannot serve', () => {
    mount({ emailOtp: false, appleSignIn: false, googleSignIn: false, guest: true })
    expect(screen.getByRole('button', { name: '直接体验' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '已有账号？登录' })).not.toBeInTheDocument()
    document.body.innerHTML = ''
    mount({ emailOtp: true, appleSignIn: false, googleSignIn: true, guest: false })
    expect(screen.queryByRole('button', { name: '直接体验' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '已有账号？登录' })).toBeInTheDocument()
  })

  it('is translated in every App language', () => {
    for (const [locale, direct, login, title] of [
      ['en', 'Try it now', 'Already have an account? Sign in', 'Sign in or create an account'],
      ['zh-Hant', '直接體驗', '已有帳號？登入', '登入或註冊帳號'],
    ]) {
      mount(ALL, locale)
      expect(screen.getByRole('button', { name: direct })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: login }))
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
      document.body.innerHTML = ''
    }
  })

  it('leaves the standalone web welcome as it was', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    window.history.replaceState({}, '', '/app/onboarding/v1')
    render(<AppOnboardingWelcomePage />)
    expect(screen.getByRole('button', { name: /开始探索|Start exploring/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^(直接体验|Try it now)$/ })).not.toBeInTheDocument()
  })
})
