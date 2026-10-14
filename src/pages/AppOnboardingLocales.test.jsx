import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppOnboardingWelcomePage from './AppOnboardingWelcomePage.jsx'
import { ONBOARDING_COPY } from './appOnboardingLocale.js'

const messages = mock => mock.mock.calls.map(([raw]) => JSON.parse(raw))
const receive = message => window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) }))
const savedAnswers = {
  wishes: ['wisdom'], supportType: 'clarity', birthdate: '1990-06-01', birthTimeIncluded: false,
  pace: 'gentle', blessing: 'wisdom', block: 'confusion', guardianPrompt: 'guide', guardianType: 'manjushri',
}
function boot(locale, initialStep) {
  const postMessage = vi.fn()
  window.ReactNativeWebView = { postMessage }
  const view = render(<AppOnboardingWelcomePage />)
  const ready = messages(postMessage).find(message => message.event === 'bridge.ready')
  act(() => receive({ v: 1, type: 'bootstrap', event: 'bridge.bootstrap', id: ready.id,
    payload: { locale, initialStep, payload: savedAnswers, capabilities: { guest: true, googleSignIn: true, emailOtp: true, guardian: true, practice: true, ask: true } } }))
  return { ...view, postMessage }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  window.localStorage.clear()
  window.history.replaceState({}, '', '/app/onboarding/v1?embedded=1')
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  delete window.ReactNativeWebView
})

const steps = ['welcome', 'email', 'quests', 'wish_survey_1', 'birthdate', 'wish_survey_2',
  'presence_presence', 'presence_transition', 'presence_blessing', 'guardian_match',
  'guardian_first_interaction', 'first_practice', 'first_practice_completed']
describe('localized native bootstrap across the complete flow', () => {
  it.each(steps)('English %s renders without untranslated Chinese controls', step => {
    const { container } = boot('en', step)
    const main = container.querySelector('main')
    expect(main).toHaveAttribute('lang', 'en')
    expect(main.textContent.trim().length).toBeGreaterThan(25)
    expect(main.textContent).not.toMatch(/\p{Script=Han}/u)
    for (const element of main.querySelectorAll('[aria-label], [alt], [placeholder], [title]')) {
      for (const attribute of ['aria-label', 'alt', 'placeholder', 'title']) {
        expect(element.getAttribute(attribute) ?? '').not.toMatch(/\p{Script=Han}/u)
      }
    }
    // Embedded state remains native-owned, even after a localized bootstrap.
    expect(window.localStorage.getItem('buddhachat:onboarding:payload')).toBeNull()
    expect(window.localStorage.getItem('buddhachat:onboarding:completed')).toBeNull()
  })

  it.each([
    ['en', 'Continue as guest', 'Action failed. Please retry.', 'Retry'],
    ['zh-Hant', '訪客體驗', '操作失敗，請重試', '重試'],
  ])('%s localizes native failure without leaking provider text, then retries the same action', async (locale, guest, errorText, retry) => {
    const { postMessage } = boot(locale, 'welcome')
    fireEvent.click(screen.getByRole('button', { name: guest }))
    const request = messages(postMessage).find(message => message.event === 'guest.explore')
    await act(async () => receive({ v: 1, type: 'error', event: request.event, id: request.id,
      payload: { code: 'action_failed', message: 'provider-private-diagnostic', retryable: true } }))
    expect(screen.getByRole('alert')).toHaveTextContent(errorText)
    expect(screen.queryByText('provider-private-diagnostic')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: retry }))
    expect(messages(postMessage).filter(message => message.event === 'guest.explore')).toHaveLength(2)
    expect(window.localStorage.getItem('buddhachat:onboarding:completed')).toBeNull()
  })

  it('each supported locale supplies every copy field and formatter', () => {
    function shape(value) {
      if (Array.isArray(value)) return value.map(shape)
      if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, shape(value[key])]))
      return typeof value
    }
    expect(shape(ONBOARDING_COPY.en)).toEqual(shape(ONBOARDING_COPY['zh-Hans']))
    expect(shape(ONBOARDING_COPY['zh-Hant'])).toEqual(shape(ONBOARDING_COPY['zh-Hans']))
  })
})

describe('localized zen tip artwork', () => {
  it.each(['en', 'zh-Hans', 'zh-Hant'])('%s keeps one readable tip and a separate decorative landscape', locale => {
    const { container } = boot(locale, 'quests')
    const tip = container.querySelector('.onboarding-zen-tip')
    const art = tip.querySelector('.onboarding-zen-tip__art')
    expect(art).toHaveAttribute('aria-hidden', 'true')
    expect(art.querySelector('img')).toHaveAttribute('alt', '')
    expect(tip.querySelectorAll('b')).toHaveLength(1)
    expect(tip.textContent).toContain(ONBOARDING_COPY[locale].quests.tipTitle)
    expect(tip.textContent).toContain(ONBOARDING_COPY[locale].quests.tipBody)
  })
})


describe('email verification failures preserve the retry path', () => {
  const failures = [
    { code: 'action_failed', retryable: true, safeAction: 'auth.email.verify_otp' },
    { code: 'timeout', retryable: true },
    { timerExpires: true },
    { code: 'otp_expired', retryable: true },
    { retryable: true, payload: { error_code: 'otp_expired', retryable: false } },
    { code: 'otp_expired', retryable: false },
  ]
  it.each(['en', 'zh-Hans', 'zh-Hant'].flatMap(locale => failures.map(failure => [locale, failure])))(
    '%s handles %j without losing the code, email, or advancing progress', async (locale, failure) => {
      const copy = ONBOARDING_COPY[locale]
      const { postMessage } = boot(locale, 'email')
      fireEvent.change(screen.getByLabelText(copy.email.emailLabel), { target: { value: 'user@example.com' } })
      fireEvent.click(screen.getByRole('button', { name: copy.email.send }))
      const sent = messages(postMessage).find(message => message.event === 'auth.email.send_otp')
      await act(async () => receive({ v: 1, type: 'ack', event: sent.event, id: sent.id, payload: {} }))
      fireEvent.change(screen.getByLabelText(copy.email.codeLabel), { target: { value: '123456' } })
      fireEvent.click(screen.getByRole('button', { name: copy.email.verify }))
      const first = messages(postMessage).find(message => message.event === 'auth.email.verify_otp')
      expect(screen.getByRole('button', { name: copy.email.sending })).toBeDisabled()
      if (failure.timerExpires) await act(async () => vi.advanceTimersByTime(120_000))
      else await act(async () => receive({ v: 1, type: 'error', event: first.event, id: first.id,
        payload: { ...failure, message: 'provider-private-diagnostic' } }))
      expect(screen.getByRole('alert')).toHaveTextContent(
        failure.code === 'otp_expired' && !failure.retryable ? copy.email.expiredCode : copy.email.verifyFailed,
      )
      expect(screen.queryByText('provider-private-diagnostic')).not.toBeInTheDocument()
      expect(screen.getByLabelText(copy.email.codeLabel)).toHaveValue('123456')
      expect(screen.getByText(copy.email.subtitleOtp('user@example.com'))).toBeInTheDocument()
      expect(messages(postMessage).some(message => message.event === 'onboarding.persist')).toBe(false)
      fireEvent.click(screen.getByRole('button', { name: copy.email.verify }))
      const retried = messages(postMessage).filter(message => message.event === 'auth.email.verify_otp').at(-1)
      expect(retried.id).not.toBe(first.id)
      expect(retried.payload).toEqual(first.payload)
      await act(async () => receive({ v: 1, type: 'ack', event: retried.event, id: retried.id, payload: {} }))
      const progress = messages(postMessage).find(message => message.event === 'onboarding.persist')
      expect(progress.payload).toEqual({ step: 'quests', data: {} })
      await act(async () => receive({ v: 1, type: 'ack', event: progress.event, id: progress.id, payload: {} }))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.queryByLabelText(copy.email.codeLabel)).not.toBeInTheDocument()
    },
  )

  it.each([
    ['network', null],
    ['aborted request', null],
    ['unknown HTTP failure', { success: false, message: 'OTP invalid or expired', code: 'unknown' }],
    ['structured expiry', { success: false, error_code: 'otp_expired' }],
  ])('standalone %s uses the actual login error contract and permits a same-code retry', async (label, failure) => {
    window.history.replaceState({}, '', '/app/onboarding/v1')
    window.localStorage.setItem('buddhachat:onboarding:step', 'email')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true }) })
    if (failure) fetchMock.mockResolvedValueOnce({ ok: false, status: 400, json: async () => failure })
    else fetchMock.mockRejectedValueOnce(label === 'aborted request' ? new DOMException('Timed out', 'AbortError') : new TypeError('Failed to fetch'))
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true }) })
    vi.stubGlobal('fetch', fetchMock)
    render(<AppOnboardingWelcomePage />)
    const copy = ONBOARDING_COPY['zh-Hans']
    fireEvent.change(screen.getByLabelText(copy.email.emailLabel), { target: { value: 'user@example.com' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: copy.email.send })))
    fireEvent.change(screen.getByLabelText(copy.email.codeLabel), { target: { value: '123456' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: copy.email.verify })))
    expect(screen.getByRole('alert')).toHaveTextContent(
      failure?.error_code === 'otp_expired' ? copy.email.expiredCode : copy.email.verifyFailed,
    )
    expect(screen.getByLabelText(copy.email.codeLabel)).toHaveValue('123456')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: copy.email.verify })))
    const verifies = fetchMock.mock.calls.filter(([url]) => url === '/api/auth/login-with-code')
    expect(verifies).toHaveLength(2)
    expect(JSON.parse(verifies[0][1].body)).toEqual({ email: 'user@example.com', code: '123456' })
    expect(verifies[1][1].body).toBe(verifies[0][1].body)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
