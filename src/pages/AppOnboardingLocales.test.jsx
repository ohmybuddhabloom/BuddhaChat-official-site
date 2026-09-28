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
