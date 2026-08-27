import { StrictMode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AppOnboardingWelcomePage from './AppOnboardingWelcomePage.jsx'

const bridgeMessages = (postMessage) => postMessage.mock.calls.map(([message]) => JSON.parse(message))

function sendNativeMessage(message) {
  window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) }))
}

describe('AppOnboardingWelcomePage', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    delete window.ReactNativeWebView
    window.history.replaceState({}, '', '/app/onboarding/v1')
  })

  it('announces bridge readiness with the versioned envelope only when embedded', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')

    render(<AppOnboardingWelcomePage />)

    expect(postMessage).toHaveBeenCalledOnce()
    expect(JSON.parse(postMessage.mock.calls[0][0])).toEqual({
      v: 1,
      type: 'event',
      event: 'bridge.ready',
      id: expect.any(String),
      payload: {},
    })
  })

  it('uses a cryptographically random native bridge request id when available', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    vi.spyOn(window.crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001')
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')

    render(<AppOnboardingWelcomePage />)

    expect(bridgeMessages(postMessage)[0].id).toBe('h5-00000000-0000-4000-8000-000000000001')
  })

  it('re-announces bridge readiness after React StrictMode remounts the page', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')

    render(<StrictMode><AppOnboardingWelcomePage /></StrictMode>)

    expect(bridgeMessages(postMessage).filter(({ event }) => event === 'bridge.ready')).toHaveLength(2)
  })

  it('applies a matching native bootstrap step, payload, locale, and capabilities', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = JSON.parse(postMessage.mock.calls[0][0])

    act(() => window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: {
        initialStep: 'guardian_match',
        payload: { wishes: ['emotional_peace'], supportType: 'listening', guardianType: 'amitabha' },
        locale: 'en-US',
        capabilities: { emailOtp: false, guest: true, guardian: true },
      },
    }) })))

    expect(screen.getByRole('heading', { name: '阿弥陀佛' })).toBeInTheDocument()
    expect(document.querySelector('.app-onboarding')).toHaveAttribute('lang', 'en-US')
  })

  it('hides direct onboarding in the App and waits for one native ACK before opening email', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: { initialStep: 'welcome', payload: {}, locale: 'zh-Hans', capabilities: { emailOtp: true } },
    }))

    expect(screen.queryByRole('button', { name: '开始探索' })).not.toBeInTheDocument()
    const begin = screen.getByRole('button', { name: '使用邮箱继续' })
    fireEvent.click(begin)
    fireEvent.click(begin)
    const persist = bridgeMessages(postMessage).find(({ event }) => event === 'onboarding.persist')

    expect(persist).toMatchObject({
      v: 1,
      type: 'event',
      event: 'onboarding.persist',
      id: expect.any(String),
      payload: { step: 'email', data: {} },
    })
    expect(bridgeMessages(postMessage).filter(({ event }) => event === 'onboarding.persist')).toHaveLength(1)
    expect(begin).toBeDisabled()
    expect(screen.getByRole('heading', { name: '开启你的清净之旅' })).toBeInTheDocument()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: persist.event, id: persist.id, payload: {} }))

    expect(screen.getByRole('heading', { name: '使用邮箱继续' })).toBeInTheDocument()
  })

  it('persists the embedded email branch before opening it', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: { initialStep: 'welcome', payload: {}, locale: 'zh-Hans', capabilities: { emailOtp: true } },
    }))

    const email = screen.getByRole('button', { name: '使用邮箱继续' })
    fireEvent.click(email)
    const persist = bridgeMessages(postMessage).find(({ event, payload }) => event === 'onboarding.persist' && payload?.step === 'email')

    expect(persist?.payload).toEqual({ step: 'email', data: {} })
    expect(email).toBeDisabled()
    expect(screen.getByRole('heading', { name: '开启你的清净之旅' })).toBeInTheDocument()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: persist.event, id: persist.id, payload: {} }))
    expect(screen.getByRole('heading', { name: '使用邮箱继续' })).toBeInTheDocument()
  })

  it('ignores a matching native ACK with a malformed payload envelope', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: { initialStep: 'welcome', payload: {}, locale: 'zh-Hans', capabilities: { emailOtp: true } },
    }))

    fireEvent.click(screen.getByRole('button', { name: '使用邮箱继续' }))
    const persist = bridgeMessages(postMessage).find(({ event }) => event === 'onboarding.persist')
    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: persist.event, id: persist.id }))

    expect(screen.getByRole('heading', { name: '开启你的清净之旅' })).toBeInTheDocument()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: persist.event, id: persist.id, payload: {} }))
    expect(screen.getByRole('heading', { name: '使用邮箱继续' })).toBeInTheDocument()
  })

  it('persists the first survey with stable native IDs before advancing', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: { initialStep: 'wish_survey_1', payload: {}, locale: 'zh-Hans', capabilities: {} },
    }))

    fireEvent.click(screen.getByRole('button', { name: '情绪平静' }))
    fireEvent.click(screen.getByRole('button', { name: '倾听' }))
    fireEvent.click(screen.getByRole('button', { name: '继续' }))
    const persist = bridgeMessages(postMessage).find(({ payload }) => payload?.step === 'wish_survey_1_completed')

    expect(persist).toMatchObject({
      event: 'onboarding.persist',
      payload: {
        step: 'wish_survey_1_completed',
        data: { wishes: ['emotional_peace'], supportType: 'listening' },
      },
    })
    expect(screen.getByRole('button', { name: '继续' })).toBeDisabled()
    expect(screen.getByRole('heading', { name: /告诉我们/ })).toBeInTheDocument()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: persist.event, id: persist.id, payload: {} }))
    expect(screen.getByRole('heading', { name: /出生信息会加深/ })).toBeInTheDocument()
  })

  it('hydrates and persists a native ISO birthdate before advancing', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: {
        initialStep: 'birthdate',
        payload: {
          wishes: ['emotional_peace'],
          supportType: 'listening',
          birthdate: '2000-02-29',
          birthTimeIncluded: true,
          birthTime: '08:15',
        },
        locale: 'zh-Hans',
        capabilities: {},
      },
    }))

    expect(screen.getByRole('combobox', { name: '月份' })).toHaveValue('02')
    expect(screen.getByRole('combobox', { name: '日期' })).toHaveValue('29')
    expect(screen.getByRole('combobox', { name: '年份' })).toHaveValue('2000')
    expect(screen.getByLabelText('出生时间')).toHaveValue('08:15')
    fireEvent.click(screen.getByRole('button', { name: '继续' }))
    const persist = bridgeMessages(postMessage).find(({ payload }) => payload?.step === 'birthdate_completed')

    expect(persist.payload.data).toEqual({
      wishes: ['emotional_peace'],
      supportType: 'listening',
      birthdate: '2000-02-29',
      birthTimeIncluded: true,
      birthTime: '08:15',
    })
    expect(screen.getByRole('button', { name: '继续' })).toBeDisabled()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: persist.event, id: persist.id, payload: {} }))
    expect(screen.getByRole('heading', { name: /你希望如何/ })).toBeInTheDocument()
  })

  it('persists the second survey with stable native IDs before the H5 presence screen', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: {
        initialStep: 'wish_survey_2',
        payload: {
          wishes: ['emotional_peace'],
          supportType: 'listening',
          birthdate: '2000-02-29',
          birthTimeIncluded: false,
          birthTime: null,
        },
        locale: 'zh-Hans',
        capabilities: {},
      },
    }))

    fireEvent.click(screen.getByRole('button', { name: '温和' }))
    fireEvent.click(screen.getByRole('button', { name: '好运' }))
    fireEvent.click(screen.getByRole('button', { name: '焦虑' }))
    fireEvent.click(screen.getByRole('button', { name: '揭晓我的守护佛' }))
    const persist = bridgeMessages(postMessage).find(({ payload }) => payload?.step === 'wish_survey_2_completed')

    expect(persist.payload.data).toEqual({
      wishes: ['emotional_peace'],
      supportType: 'listening',
      birthdate: '2000-02-29',
      birthTimeIncluded: false,
      birthTime: null,
      pace: 'gentle',
      blessing: 'good_fortune',
      block: 'anxiety',
    })
    expect(screen.getByRole('heading', { name: /你希望如何/ })).toBeInTheDocument()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: persist.event, id: persist.id, payload: {} }))
    expect(screen.getByRole('heading', { name: '佛的临在' })).toBeInTheDocument()
  })

  it('unlocks an embedded action after the native ACK timeout so it can retry', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: { initialStep: 'welcome', payload: {}, locale: 'zh-Hans', capabilities: { emailOtp: true } },
    }))

    const begin = screen.getByRole('button', { name: '使用邮箱继续' })
    fireEvent.click(begin)
    await act(async () => vi.advanceTimersByTime(12_000))

    expect(begin).toBeEnabled()
    expect(screen.getByRole('alert')).toHaveTextContent('App 响应超时，请重试')
    fireEvent.click(begin)
    expect(bridgeMessages(postMessage).filter(({ event }) => event === 'onboarding.persist')).toHaveLength(2)
  })

  it('allows enough time for a person to finish native sign-in', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: {
        initialStep: 'welcome',
        payload: {},
        locale: 'zh-Hans',
        capabilities: { googleSignIn: true },
      },
    }))

    const google = screen.getByRole('button', { name: '使用 Google 继续' })
    fireEvent.click(google)
    await act(async () => vi.advanceTimersByTime(12_000))

    expect(google).toBeDisabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await act(async () => vi.advanceTimersByTime(108_000))
    expect(google).toBeEnabled()
    expect(screen.getByRole('alert')).toHaveTextContent('App 响应超时，请重试')
  })

  it('does not turn a slow email OTP request into a false App timeout', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: {
        initialStep: 'welcome',
        payload: {},
        locale: 'zh-Hans',
        capabilities: { emailOtp: true },
      },
    }))

    fireEvent.click(screen.getByRole('button', { name: '使用邮箱继续' }))
    const emailProgress = bridgeMessages(postMessage).find(({ event, payload }) => event === 'onboarding.persist' && payload?.step === 'email')
    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: emailProgress.event, id: emailProgress.id, payload: {} }))
    fireEvent.change(screen.getByLabelText('邮箱地址'), { target: { value: 'user@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: '发送验证码' }))
    await act(async () => vi.advanceTimersByTime(12_000))

    expect(screen.getByRole('button', { name: '请稍候…' })).toBeDisabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await act(async () => vi.advanceTimersByTime(108_000))
    expect(screen.getByRole('button', { name: '发送验证码' })).toBeEnabled()
    expect(screen.getByRole('alert')).toHaveTextContent('验证码发送失败，请稍后再试')
  })

  it('renders the guardianType supplied by native bootstrap', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]

    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: {
        initialStep: 'guardian_match',
        payload: { wishes: ['emotional_peace'], guardianType: 'manjushri' },
        locale: 'zh-Hans',
        capabilities: {},
      },
    }))

    expect(screen.getByRole('heading', { name: '文殊菩萨' })).toBeInTheDocument()
  })

  it('announces each bootstrapped H5 screen once under React StrictMode', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<StrictMode><AppOnboardingWelcomePage /></StrictMode>)
    const ready = bridgeMessages(postMessage).filter(({ event }) => event === 'bridge.ready').at(-1)

    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: {
        initialStep: 'guardian_match',
        payload: { guardianType: 'manjushri' },
        locale: 'zh-Hans',
        capabilities: {},
      },
    }))

    expect(bridgeMessages(postMessage).filter(({ event }) => event === 'onboarding.step_ready')).toEqual([{
      v: 1,
      type: 'event',
      event: 'onboarding.step_ready',
      id: expect.any(String),
      payload: { step: 'guardian_match' },
    }])
  })

  it('waits for one persisted presence transition before the automatic H5 advance', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<StrictMode><AppOnboardingWelcomePage /></StrictMode>)
    const ready = bridgeMessages(postMessage).filter(({ event }) => event === 'bridge.ready').at(-1)
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: {
        initialStep: 'presence_presence',
        payload: { wishes: ['emotional_peace'] },
        locale: 'zh-Hans',
        capabilities: {},
      },
    }))

    act(() => vi.advanceTimersByTime(3000))
    const persists = bridgeMessages(postMessage).filter(({ event, payload }) => event === 'onboarding.persist' && payload?.step === 'presence_transition')
    expect(persists).toHaveLength(1)
    expect(screen.getByRole('heading', { name: '佛的临在' })).toBeInTheDocument()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: persists[0].event, id: persists[0].id, payload: {} }))
    expect(screen.getByRole('heading', { name: /正在校准/ })).toBeInTheDocument()
  })

  it('drops later answers when resuming an earlier automatic step', () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: {
        initialStep: 'presence_presence',
        payload: {
          wishes: ['emotional_peace'], supportType: 'listening', birthdate: '1990-06-01',
          birthTimeIncluded: false, birthTime: null, pace: 'gentle', blessing: 'peace',
          block: 'anxiety', guardianPrompt: 'peace', guardianType: 'amitabha',
        },
        locale: 'zh-Hans',
        capabilities: {},
      },
    }))

    act(() => vi.advanceTimersByTime(3000))

    const persist = bridgeMessages(postMessage).find(({ event, payload }) =>
      event === 'onboarding.persist' && payload?.step === 'presence_transition')
    expect(persist.payload.data).not.toHaveProperty('guardianPrompt')
  })

  it('stays on an automatic screen and offers retry after a native error', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: { initialStep: 'presence_presence', payload: {}, locale: 'zh-Hans', capabilities: {} },
    }))
    act(() => vi.advanceTimersByTime(3000))
    const persist = bridgeMessages(postMessage).find(({ event, payload }) => event === 'onboarding.persist' && payload?.step === 'presence_transition')

    await act(async () => sendNativeMessage({
      v: 1,
      type: 'error',
      event: persist.event,
      id: persist.id,
      payload: { code: 'save_failed', message: '保存失败', retryable: true },
    }))

    expect(screen.getByRole('heading', { name: '佛的临在' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('保存失败')
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(bridgeMessages(postMessage).filter(({ event, payload }) => event === 'onboarding.persist' && payload?.step === 'presence_transition')).toHaveLength(2)
  })

  it('persists the blessing milestone before the resonance screen advances', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: { initialStep: 'presence_transition', payload: {}, locale: 'zh-Hans', capabilities: {} },
    }))

    act(() => vi.advanceTimersByTime(4200))
    const persist = bridgeMessages(postMessage).find(({ event, payload }) => event === 'onboarding.persist' && payload?.step === 'presence_blessing')
    expect(persist).toBeDefined()
    expect(screen.getByRole('heading', { name: /正在校准/ })).toBeInTheDocument()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: persist.event, id: persist.id, payload: {} }))
    expect(screen.getByRole('heading', { name: /正在准备/ })).toBeInTheDocument()
  })

  it('uses native guardian resolution and persists the match before reveal', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: { initialStep: 'presence_blessing', payload: { wishes: ['emotional_peace'] }, locale: 'zh-Hans', capabilities: { guardian: true } },
    }))

    act(() => vi.advanceTimersByTime(3000))
    const resolve = bridgeMessages(postMessage).find(({ event }) => event === 'guardian.resolve')
    expect(resolve?.payload).toEqual({})
    expect(screen.getByRole('heading', { name: /正在准备/ })).toBeInTheDocument()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: resolve.event, id: resolve.id, payload: { guardianType: 'amitabha' } }))
    const persist = bridgeMessages(postMessage).find(({ event, payload }) => event === 'onboarding.persist' && payload?.step === 'guardian_match')
    expect(persist).toBeDefined()
    expect(screen.getByRole('heading', { name: /正在准备/ })).toBeInTheDocument()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: persist.event, id: persist.id, payload: {} }))
    expect(screen.getByRole('heading', { name: '阿弥陀佛' })).toBeInTheDocument()
  })

  it('persists the first guardian interaction before entering H5 conversation', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: { initialStep: 'guardian_match', payload: { guardianType: 'amitabha' }, locale: 'zh-Hans', capabilities: { guardian: true } },
    }))

    const meet = screen.getByRole('button', { name: '遇见我的守护佛' })
    fireEvent.click(meet)
    fireEvent.click(meet)
    const persists = bridgeMessages(postMessage).filter(({ event, payload }) => event === 'onboarding.persist' && payload?.step === 'guardian_first_interaction')
    expect(persists).toHaveLength(1)
    expect(meet).toBeDisabled()
    expect(screen.getByRole('heading', { name: '守护佛已显现' })).toBeInTheDocument()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: persists[0].event, id: persists[0].id, payload: {} }))
    expect(screen.getByRole('heading', { name: '阿弥陀佛' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '开始对话' })).toBeInTheDocument()
  })

  it('persists first practice and keeps the practice experience in H5', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: { initialStep: 'guardian_match', payload: { guardianType: 'amitabha' }, locale: 'zh-Hans', capabilities: { practice: true } },
    }))

    fireEvent.click(screen.getByRole('button', { name: '开始 30 秒练习' }))
    const persist = bridgeMessages(postMessage).find(({ event, payload }) => event === 'onboarding.persist' && payload?.step === 'first_practice')
    expect(persist).toBeDefined()
    expect(bridgeMessages(postMessage).some(({ event, payload }) => event === 'navigation.open' && payload?.destination === 'practice')).toBe(false)
    expect(screen.getByRole('heading', { name: '守护佛已显现' })).toBeInTheDocument()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: persist.event, id: persist.id, payload: {} }))
    expect(screen.getByRole('heading', { name: '30 秒安住练习' })).toBeInTheDocument()
  })

  it('completes onboarding before opening native Ask from H5 conversation', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: { initialStep: 'guardian_first_interaction', payload: { guardianType: 'amitabha' }, locale: 'zh-Hans', capabilities: { ask: true } },
    }))

    fireEvent.click(screen.getByRole('button', { name: '我寻求平静' }))
    const begin = screen.getByRole('button', { name: '开始对话' })
    fireEvent.click(begin)
    fireEvent.click(begin)
    const interaction = bridgeMessages(postMessage).find(({ event, payload }) => event === 'onboarding.persist' && payload?.step === 'guardian_first_interaction')
    expect(interaction.payload.data.guardianPrompt).toBe('peace')
    expect(begin).toBeDisabled()
    expect(bridgeMessages(postMessage).some(({ event }) => event === 'onboarding.complete')).toBe(false)

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: interaction.event, id: interaction.id, payload: {} }))
    const complete = bridgeMessages(postMessage).find(({ event }) => event === 'onboarding.complete')
    expect(complete?.payload).toEqual({})
    expect(bridgeMessages(postMessage).some(({ event }) => event === 'navigation.open')).toBe(false)

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: complete.event, id: complete.id, payload: {} }))
    const openAsk = bridgeMessages(postMessage).find(({ event }) => event === 'navigation.open')
    expect(openAsk?.payload).toEqual({ destination: 'ask' })

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: openAsk.event, id: openAsk.id, payload: {} }))
    expect(screen.getByRole('button', { name: '开始对话' })).toBeEnabled()
    expect(screen.queryByRole('heading', { name: '你已经开始了' })).not.toBeInTheDocument()
  })

  it('reports a real 30 second H5 practice before native completion', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: { initialStep: 'first_practice', payload: { guardianType: 'amitabha' }, locale: 'zh-Hans', capabilities: { practice: true } },
    }))

    fireEvent.click(screen.getByRole('button', { name: '开始 30 秒练习' }))
    act(() => vi.advanceTimersByTime(29_999))
    expect(screen.queryByRole('button', { name: '完成' })).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    const finish = screen.getByRole('button', { name: '完成' })
    fireEvent.click(finish)
    fireEvent.click(finish)
    const completions = bridgeMessages(postMessage).filter(({ event }) => event === 'onboarding.complete')

    expect(completions).toHaveLength(1)
    expect(completions[0].payload).toEqual({ firstPracticeDurationSeconds: 30 })
    expect(finish).toBeDisabled()
    expect(screen.getByRole('heading', { name: '30 秒安住练习' })).toBeInTheDocument()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: completions[0].event, id: completions[0].id, payload: {} }))
    expect(screen.queryByRole('heading', { name: '你已经开始了' })).not.toBeInTheDocument()
  })

  it('persists before opening H5 practice from conversation', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: { initialStep: 'guardian_first_interaction', payload: { guardianType: 'amitabha' }, locale: 'zh-Hans', capabilities: { practice: true } },
    }))

    fireEvent.click(screen.getByRole('button', { name: '开始 30 秒练习' }))
    const persist = bridgeMessages(postMessage).find(({ event, payload }) => event === 'onboarding.persist' && payload?.step === 'first_practice')
    expect(persist).toBeDefined()
    expect(screen.getByRole('button', { name: '开始对话' })).toBeInTheDocument()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: persist.event, id: persist.id, payload: {} }))
    expect(screen.getByRole('heading', { name: '30 秒安住练习' })).toBeInTheDocument()
  })

  it('does not flash a stale standalone step before native bootstrap', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    window.localStorage.setItem('buddhachat:onboarding:step', 'guardian')
    window.localStorage.setItem('buddhachat:onboarding:payload', JSON.stringify({ improvement: '情绪平静' }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')

    render(<AppOnboardingWelcomePage />)

    expect(screen.getByRole('status')).toHaveTextContent('正在连接 App')
    expect(screen.queryByRole('heading', { name: '守护佛已显现' })).not.toBeInTheDocument()
  })

  it('shows native sign-in capabilities and waits through auth and progress ACKs', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: {
        initialStep: 'welcome',
        payload: {},
        locale: 'zh-Hans',
        capabilities: { emailOtp: false, appleSignIn: true, googleSignIn: true, guest: false },
      },
    }))

    expect(screen.getByRole('button', { name: '使用 Apple 继续' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '使用邮箱继续' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '游客体验' })).not.toBeInTheDocument()
    const google = screen.getByRole('button', { name: '使用 Google 继续' })
    fireEvent.click(google)
    fireEvent.click(google)
    const auth = bridgeMessages(postMessage).filter(({ event }) => event === 'auth.sign_in')
    expect(auth).toHaveLength(1)
    expect(auth[0].payload).toEqual({ provider: 'google' })
    expect(google).toBeDisabled()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: auth[0].event, id: auth[0].id, payload: {} }))
    const progress = bridgeMessages(postMessage).find(({ event, payload }) => event === 'onboarding.persist' && payload?.step === 'quests')
    expect(progress).toBeDefined()
    expect(screen.getByRole('heading', { name: '开启你的清净之旅' })).toBeInTheDocument()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: progress.event, id: progress.id, payload: {} }))
    expect(screen.getByRole('heading', { name: /你的清净之路/ })).toBeInTheDocument()
  })

  it('stays on welcome when native sign-in is cancelled', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: {
        initialStep: 'welcome',
        payload: {},
        locale: 'zh-Hans',
        capabilities: { googleSignIn: true },
      },
    }))

    fireEvent.click(screen.getByRole('button', { name: '使用 Google 继续' }))
    const auth = bridgeMessages(postMessage).find(({ event }) => event === 'auth.sign_in')
    await act(async () => sendNativeMessage({
      v: 1,
      type: 'error',
      event: auth.event,
      id: auth.id,
      payload: { code: 'action_failed', message: '登录已取消', retryable: true },
    }))

    expect(screen.getByRole('heading', { name: '开启你的清净之旅' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('登录已取消')
    expect(bridgeMessages(postMessage).filter(({ event }) => event === 'onboarding.persist')).toHaveLength(0)
  })

  it('waits for native guest ACK without showing the standalone completion screen', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: { initialStep: 'welcome', payload: {}, locale: 'zh-Hans', capabilities: { guest: true } },
    }))

    const guest = screen.getByRole('button', { name: '游客体验' })
    fireEvent.click(guest)
    fireEvent.click(guest)
    const requests = bridgeMessages(postMessage).filter(({ event }) => event === 'guest.explore')
    expect(requests).toHaveLength(1)
    expect(requests[0].payload).toEqual({})
    expect(guest).toBeDisabled()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: requests[0].event, id: requests[0].id, payload: {} }))
    expect(screen.getByRole('heading', { name: '开启你的清净之旅' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '游客体验已开启' })).not.toBeInTheDocument()
  })

  it('uses native email OTP messages for both embedded auth phases', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: { initialStep: 'welcome', payload: {}, locale: 'zh-Hans', capabilities: { emailOtp: true } },
    }))

    fireEvent.click(screen.getByRole('button', { name: '使用邮箱继续' }))
    const emailProgress = bridgeMessages(postMessage).find(({ event, payload }) => event === 'onboarding.persist' && payload?.step === 'email')
    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: emailProgress.event, id: emailProgress.id, payload: {} }))
    expect(bridgeMessages(postMessage)).toContainEqual(expect.objectContaining({
      event: 'onboarding.step_ready',
      payload: { step: 'email' },
    }))
    fireEvent.change(screen.getByLabelText('邮箱地址'), { target: { value: ' USER@Example.COM ' } })
    fireEvent.click(screen.getByRole('button', { name: '发送验证码' }))
    const sendOtp = bridgeMessages(postMessage).find(({ event }) => event === 'auth.email.send_otp')
    expect(sendOtp?.payload).toEqual({ email: 'user@example.com' })
    expect(screen.getByRole('button', { name: '请稍候…' })).toBeDisabled()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: sendOtp.event, id: sendOtp.id, payload: {} }))
    expect(screen.getByRole('heading', { name: '输入邮箱验证码' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('6 位验证码'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: '验证并继续' }))
    const verifyOtp = bridgeMessages(postMessage).find(({ event }) => event === 'auth.email.verify_otp')
    expect(verifyOtp?.payload).toEqual({ email: 'user@example.com', token: '123456' })

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: verifyOtp.event, id: verifyOtp.id, payload: {} }))
    const progress = bridgeMessages(postMessage).find(({ event, payload }) => event === 'onboarding.persist' && payload?.step === 'quests')
    expect(progress).toBeDefined()
    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: progress.event, id: progress.id, payload: {} }))
    expect(screen.getByRole('heading', { name: /你的清净之路/ })).toBeInTheDocument()
  })

  it('keeps native onboarding answers out of H5 localStorage', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    window.localStorage.setItem('buddhachat:onboarding:step', 'birthdate')
    window.localStorage.setItem('buddhachat:onboarding:payload', JSON.stringify({ birthdate: '1990-06-01' }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]

    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: {
        initialStep: 'birthdate',
        payload: {
          wishes: ['health'],
          supportType: 'guidance',
          birthdate: '1990-06-01',
          birthTimeIncluded: true,
          birthTime: '07:30',
        },
        locale: 'zh-Hans',
        capabilities: {},
      },
    }))

    expect(window.localStorage.getItem('buddhachat:onboarding:step')).toBeNull()
    expect(window.localStorage.getItem('buddhachat:onboarding:payload')).toBeNull()
  })

  it('retries progress sync without reusing a verified email code', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: { initialStep: 'welcome', payload: {}, locale: 'zh-Hans', capabilities: { emailOtp: true } },
    }))

    fireEvent.click(screen.getByRole('button', { name: '使用邮箱继续' }))
    const emailProgress = bridgeMessages(postMessage).find(({ event, payload }) => event === 'onboarding.persist' && payload?.step === 'email')
    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: emailProgress.event, id: emailProgress.id, payload: {} }))
    fireEvent.change(screen.getByLabelText('邮箱地址'), { target: { value: 'user@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: '发送验证码' }))
    const sendOtp = bridgeMessages(postMessage).find(({ event }) => event === 'auth.email.send_otp')
    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: sendOtp.event, id: sendOtp.id, payload: {} }))

    fireEvent.change(screen.getByLabelText('6 位验证码'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: '验证并继续' }))
    const verifyOtp = bridgeMessages(postMessage).find(({ event }) => event === 'auth.email.verify_otp')
    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: verifyOtp.event, id: verifyOtp.id, payload: {} }))

    const firstProgress = bridgeMessages(postMessage).find(({ event, payload }) => event === 'onboarding.persist' && payload?.step === 'quests')
    await act(async () => sendNativeMessage({
      v: 1,
      type: 'error',
      event: firstProgress.event,
      id: firstProgress.id,
      payload: { code: 'action_failed', message: 'Unable to complete this action. Please retry.', retryable: true },
    }))

    expect(screen.getByRole('alert')).toHaveTextContent('登录成功，但同步进度失败，请重试')
    fireEvent.click(screen.getByRole('button', { name: '重试同步' }))
    expect(bridgeMessages(postMessage).filter(({ event }) => event === 'auth.email.verify_otp')).toHaveLength(1)
    expect(bridgeMessages(postMessage).filter(({ event, payload }) => event === 'onboarding.persist' && payload?.step === 'quests')).toHaveLength(2)
  })

  it('sends legal targets to native and prevents browser navigation when embedded', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: { initialStep: 'welcome', payload: {}, locale: 'zh-Hans', capabilities: {} },
    }))

    fireEvent.click(screen.getByRole('link', { name: '服务条款' }))
    const terms = bridgeMessages(postMessage).find(({ event }) => event === 'navigation.external')
    expect(terms?.payload).toEqual({ target: 'terms' })
    expect(window.location.pathname).toBe('/app/onboarding/v1')

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: terms.event, id: terms.id, payload: {} }))
    fireEvent.click(screen.getByRole('link', { name: '隐私政策' }))
    expect(bridgeMessages(postMessage).filter(({ event }) => event === 'navigation.external').at(-1).payload).toEqual({ target: 'privacy' })
  })

  it('keeps an embedded completed recovery state inside the App', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: { initialStep: 'first_practice_completed', payload: { guardianType: 'amitabha' }, locale: 'zh-Hans', capabilities: {} },
    }))

    expect(screen.getByRole('heading', { name: '你已经开始了' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '重新查看引导' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '返回官网首页' })).not.toBeInTheDocument()
    expect(bridgeMessages(postMessage).some(({ event }) => event === 'onboarding.restart')).toBe(false)
  })

  it('persists an embedded back target so native cold resume returns to the same screen', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: {
        initialStep: 'birthdate_completed',
        payload: { wishes: ['emotional_peace'], supportType: 'listening', birthdate: '2000-02-29', birthTimeIncluded: false, birthTime: null },
        locale: 'zh-Hans',
        capabilities: {},
      },
    }))

    fireEvent.click(screen.getByRole('button', { name: '返回' }))
    const back = bridgeMessages(postMessage).find(({ event, payload }) => event === 'onboarding.persist' && payload?.step === 'birthdate')
    expect(back?.payload.data).toEqual({
      wishes: ['emotional_peace'],
      supportType: 'listening',
    })
    expect(screen.getByRole('heading', { name: /你希望如何/ })).toBeInTheDocument()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: back.event, id: back.id, payload: {} }))
    expect(screen.getByRole('heading', { name: /出生信息会加深/ })).toBeInTheDocument()
  })

  it('persists and returns one H5 step when Android sends native back', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: {
        initialStep: 'wish_survey_2',
        payload: { wishes: ['emotional_peace'], supportType: 'listening', birthdate: '2000-02-29', birthTimeIncluded: false, birthTime: null },
        locale: 'zh-Hans',
        capabilities: {},
      },
    }))

    act(() => window.dispatchEvent(new Event('buddhachat:native-back')))
    const back = bridgeMessages(postMessage).find(({ event, payload }) => event === 'onboarding.persist' && payload?.step === 'birthdate')
    expect(back?.payload.data).toEqual({ wishes: ['emotional_peace'], supportType: 'listening' })
    expect(screen.getByRole('heading', { name: /你希望如何/ })).toBeInTheDocument()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: back.event, id: back.id, payload: {} }))
    expect(screen.getByRole('heading', { name: /出生信息会加深/ })).toBeInTheDocument()
  })

  it('persists the first survey entry before leaving quests', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: { initialStep: 'quests', payload: {}, locale: 'zh-Hans', capabilities: {} },
    }))

    const wish = screen.getByRole('button', { name: '分享你的心愿' })
    fireEvent.click(wish)
    fireEvent.click(wish)
    const requests = bridgeMessages(postMessage).filter(({ event, payload }) => event === 'onboarding.persist' && payload?.step === 'wish_survey_1')
    expect(requests).toHaveLength(1)
    expect(requests[0].payload.data).toEqual({})
    expect(wish).toBeDisabled()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: requests[0].event, id: requests[0].id, payload: {} }))
    expect(screen.getByRole('heading', { name: /告诉我们/ })).toBeInTheDocument()
  })

  it('restores real quest progress and opens the next unfinished quest', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<AppOnboardingWelcomePage />)
    const ready = bridgeMessages(postMessage)[0]
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: {
        initialStep: 'quests',
        payload: {
          wishes: ['health'],
          supportType: 'guidance',
          birthdate: '1990-06-15',
          birthTimeIncluded: false,
          birthTime: null,
        },
        locale: 'zh-Hans',
        capabilities: {},
      },
    }))

    expect(screen.getByText('已完成 2 / 3 个必做步骤')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '深化你的心愿' }))

    expect(bridgeMessages(postMessage).find(({ event, payload }) => (
      event === 'onboarding.persist' && payload?.step === 'wish_survey_2'
    ))).toMatchObject({
      payload: {
        data: {
          wishes: ['health'],
          supportType: 'guidance',
          birthdate: '1990-06-15',
          birthTimeIncluded: false,
          birthTime: null,
        },
      },
    })
  })

  it('resolves a missing native guardian on cold resume before revealing it', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const postMessage = vi.fn()
    window.ReactNativeWebView = { postMessage }
    window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
    render(<StrictMode><AppOnboardingWelcomePage /></StrictMode>)
    const ready = bridgeMessages(postMessage).filter(({ event }) => event === 'bridge.ready').at(-1)
    act(() => sendNativeMessage({
      v: 1,
      type: 'bootstrap',
      event: 'bridge.bootstrap',
      id: ready.id,
      payload: { initialStep: 'guardian_match', payload: { wishes: ['emotional_peace'] }, locale: 'zh-Hans', capabilities: { guardian: true } },
    }))

    const requests = bridgeMessages(postMessage).filter(({ event }) => event === 'guardian.resolve')
    expect(requests).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('正在获取你的守护佛')
    expect(screen.queryByRole('heading', { name: '阿弥陀佛' })).not.toBeInTheDocument()

    await act(async () => sendNativeMessage({ v: 1, type: 'ack', event: requests[0].event, id: requests[0].id, payload: { guardianType: 'amitabha' } }))
    expect(screen.getByRole('heading', { name: '阿弥陀佛' })).toBeInTheDocument()
  })

  it('runs the complete onboarding path and saves the current step', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    render(<AppOnboardingWelcomePage />)

    expect(screen.getByRole('heading', { name: '开启你的清净之旅' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '开始探索' }))
    expect(screen.getByRole('heading', { name: /你的清净之路/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /分享你的心愿/ }))
    fireEvent.click(screen.getByRole('button', { name: '情绪平静' }))
    fireEvent.click(screen.getByRole('button', { name: '倾听' }))
    fireEvent.click(screen.getByRole('button', { name: '继续' }))
    expect(screen.getByRole('heading', { name: /出生信息会加深/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '继续' }))
    fireEvent.click(screen.getByRole('button', { name: '温和' }))
    fireEvent.click(screen.getByRole('button', { name: '好运' }))
    fireEvent.click(screen.getByRole('button', { name: '焦虑' }))
    fireEvent.click(screen.getByRole('button', { name: '揭晓我的守护佛' }))
    expect(screen.getByRole('heading', { name: '佛的临在' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '暂时跳过' }))
    expect(screen.getByRole('heading', { name: /正在校准/ })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(4200))
    expect(screen.getByRole('heading', { name: /正在准备/ })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(3000))
    expect(screen.getByRole('heading', { name: '守护佛已显现' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '遇见我的守护佛' }))
    expect(screen.getByRole('heading', { name: '阿弥陀佛' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '开始 30 秒练习' }))
    expect(screen.getByRole('heading', { name: '30 秒安住练习' })).toBeInTheDocument()
    expect(window.localStorage.getItem('buddhachat:onboarding:step')).toBe('practice')
  })

  it('keeps email login as a reversible branch', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { onboardingStep: 'welcome', onboardingDepth: 0 } }))
    })
    render(<AppOnboardingWelcomePage />)

    fireEvent.click(screen.getByRole('button', { name: '使用邮箱继续' }))
    expect(screen.getByRole('heading', { name: '使用邮箱继续' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '返回' }))
    expect(historyBack).toHaveBeenCalledOnce()
    expect(screen.getByRole('heading', { name: '开启你的清净之旅' })).toBeInTheDocument()
  })

  it('keeps original reading time when reduced motion is enabled', () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    window.localStorage.setItem('buddhachat:onboarding:step', 'presence')
    render(<AppOnboardingWelcomePage />)

    act(() => vi.advanceTimersByTime(2999))
    expect(screen.getByRole('heading', { name: '佛的临在' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('heading', { name: /正在校准/ })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(4199))
    expect(screen.getByRole('heading', { name: /正在校准/ })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('heading', { name: /正在准备/ })).toBeInTheDocument()
  })

  it('announces the new screen without triggering WebView focus scrolling', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    render(<AppOnboardingWelcomePage />)

    fireEvent.click(screen.getByRole('button', { name: '开始探索' }))

    expect(screen.getByRole('heading', { name: /你的清净之路/ })).not.toHaveFocus()
    expect(screen.getByText('你的清净之路', { selector: '[aria-live="polite"]' })).toBeInTheDocument()
  })

  it('does not steal focus when the onboarding first opens', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    render(<AppOnboardingWelcomePage />)

    expect(screen.getByRole('heading', { name: '开启你的清净之旅' })).not.toHaveFocus()
  })

  it('announces progress with an accessible progressbar', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    window.localStorage.setItem('buddhachat:onboarding:step', 'wish-one')
    render(<AppOnboardingWelcomePage />)

    expect(screen.getByRole('progressbar', { name: '引导进度' })).toHaveAttribute('aria-valuenow', '2')
    expect(screen.getByRole('progressbar', { name: '引导进度' })).toHaveAttribute('aria-valuemax', '10')
  })

  it.each([
    ['情绪平静', '阿弥陀佛'],
    ['人际关系', '观音菩萨'],
    ['事业', '虚空藏菩萨'],
    ['健康', '药师佛'],
    ['财富', '财神'],
    ['守护', '地藏菩萨'],
    ['智慧', '文殊菩萨'],
  ])('matches %s with %s', (improvement, guardian) => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    window.localStorage.setItem('buddhachat:onboarding:step', 'guardian')
    window.localStorage.setItem('buddhachat:onboarding:payload', JSON.stringify({ improvement }))
    render(<AppOnboardingWelcomePage />)

    expect(screen.getByRole('heading', { name: guardian })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: guardian })).toHaveAttribute('src', expect.stringMatching(/-full\.webp$/))
  })

  it('counts a full 30 second practice and completes onboarding', () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    window.localStorage.setItem('buddhachat:onboarding:step', 'practice')
    render(<AppOnboardingWelcomePage />)

    fireEvent.click(screen.getByRole('button', { name: '开始 30 秒练习' }))
    act(() => vi.advanceTimersByTime(30_000))
    fireEvent.click(screen.getByRole('button', { name: '完成' }))

    expect(screen.getByRole('heading', { name: '你已经开始了' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重新查看引导' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回官网首页' })).toHaveAttribute('href', '/')
    expect(window.localStorage.getItem('buddhachat:onboarding:completed')).toBe('true')
  })
})
