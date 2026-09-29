import { useEffect, useMemo, useRef, useState } from 'react'

import { loginWithCode, sendLoginCode } from '../lib/fusionAuth.js'
import {
  BLESSING_IDS,
  getOnboardingCopy,
  IMPROVEMENT_IDS,
  INNER_STATE_IDS,
  LEGACY_IMPROVEMENT_IDS,
  LEGACY_MONTH_IDS,
  LEGACY_SUPPORT_IDS,
  monthPairs,
  normalizeOnboardingLocale,
  optionPairs,
  ONBOARDING_COPY,
  PACE_IDS,
  PROMPT_IDS,
  SUPPORT_IDS,
} from './appOnboardingLocale.js'
import './AppOnboardingWelcomePage.css'

const STORAGE = {
  completed: 'buddhachat:onboarding:completed',
  guestBypassed: 'buddhachat:onboarding:guest-bypassed',
  payload: 'buddhachat:onboarding:payload',
  step: 'buddhachat:onboarding:step',
}

const MAIN_STEPS = [
  'quests',
  'wish-one',
  'birthdate',
  'wish-two',
  'presence',
  'resonance',
  'blessing',
  'guardian',
  'conversation',
  'practice',
]

const STEP_NUMBER = Object.fromEntries(MAIN_STEPS.map((step, index) => [step, index + 1]))

const DEFAULT_PAYLOAD = {
  improvement: '',
  support: '',
  month: '06',
  day: '1',
  year: '1990',
  includeTime: false,
  time: '07:30',
  pace: '',
  blessing: '',
  innerState: '',
  prompt: '',
  guardianType: '',
}

const VALID_STEPS = new Set(['welcome', 'email', ...MAIN_STEPS, 'complete', 'guest-home'])
const BRIDGE_ACK_TIMEOUT_MS = 12_000
const BRIDGE_AUTH_TIMEOUT_MS = 120_000
const BRIDGE_EVENTS = new Set([
  'auth.email.send_otp',
  'auth.email.verify_otp',
  'auth.sign_in',
  'guest.explore',
  'onboarding.persist',
  'guardian.resolve',
  'navigation.open',
  'onboarding.complete',
  'onboarding.step_ready',
  'navigation.external',
])

const NATIVE_STEP_TO_H5 = {
  welcome: 'welcome',
  email: 'email',
  quests: 'quests',
  wish_survey_1: 'wish-one',
  wish_survey_1_completed: 'birthdate',
  birthdate: 'birthdate',
  birthdate_completed: 'wish-two',
  wish_survey_2: 'wish-two',
  wish_survey_2_completed: 'presence',
  presence_presence: 'presence',
  presence_transition: 'resonance',
  presence_blessing: 'blessing',
  guardian_match: 'guardian',
  guardian_first_interaction: 'conversation',
  first_practice: 'practice',
  first_practice_completed: 'complete',
}

const H5_STEP_TO_NATIVE = {
  welcome: 'welcome',
  email: 'email',
  quests: 'quests',
  'wish-one': 'wish_survey_1',
  birthdate: 'birthdate',
  'wish-two': 'wish_survey_2',
  presence: 'presence_presence',
  resonance: 'presence_transition',
  blessing: 'presence_blessing',
  guardian: 'guardian_match',
  conversation: 'guardian_first_interaction',
  practice: 'first_practice',
  complete: 'first_practice_completed',
  'guest-home': 'welcome',
}

const ZH_HANS_COPY = ONBOARDING_COPY['zh-Hans']
const IMPROVEMENTS = optionPairs(IMPROVEMENT_IDS, ZH_HANS_COPY.options.improvements)
const SUPPORTS = optionPairs(SUPPORT_IDS, ZH_HANS_COPY.options.supports)
const MONTHS = monthPairs(ZH_HANS_COPY.options.months)
const PACE_OPTIONS = optionPairs(PACE_IDS, ZH_HANS_COPY.options.pace)
const BLESSING_OPTIONS = optionPairs(BLESSING_IDS, ZH_HANS_COPY.options.blessing)
const INNER_STATE_OPTIONS = optionPairs(INNER_STATE_IDS, ZH_HANS_COPY.options.innerState)
const PROMPTS = optionPairs(PROMPT_IDS, ZH_HANS_COPY.options.prompts)

const OPTION_IDS = {
  pace: new Set(PACE_OPTIONS.map(([id]) => id)),
  blessing: new Set(BLESSING_OPTIONS.map(([id]) => id)),
  innerState: new Set(INNER_STATE_OPTIONS.map(([id]) => id)),
  prompt: new Set(PROMPTS.map(([id]) => id)),
}

const CAPABILITY_KEYS = ['emailOtp', 'appleSignIn', 'googleSignIn', 'guest', 'guardian', 'ask', 'practice']

function createBridgeMessageId(sequence) {
  if (typeof window.crypto?.randomUUID === 'function') return `h5-${window.crypto.randomUUID()}`
  if (typeof window.crypto?.getRandomValues === 'function') {
    const words = window.crypto.getRandomValues(new Uint32Array(4))
    return `h5-${Array.from(words, (word) => word.toString(16).padStart(8, '0')).join('')}`
  }
  return `h5-${Date.now()}-${sequence}`
}

function readJson(key, fallback) {
  try {
    return JSON.parse(window.localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

function readInitialStep() {
  const saved = window.localStorage.getItem(STORAGE.step)
  return VALID_STEPS.has(saved) ? saved : 'welcome'
}

function readInitialPayload() {
  const saved = readJson(STORAGE.payload, {})
  const legacyMonth = LEGACY_MONTH_IDS[saved.month]
  return {
    ...DEFAULT_PAYLOAD,
    ...saved,
    improvement: LEGACY_IMPROVEMENT_IDS[saved.improvement] ?? saved.improvement ?? '',
    support: LEGACY_SUPPORT_IDS[saved.support] ?? saved.support ?? '',
    month: legacyMonth ?? saved.month ?? DEFAULT_PAYLOAD.month,
  }
}

function parseBirthdate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match) return null
  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  if (date.toISOString().slice(0, 10) !== value) return null
  return { year, month, day: String(Number(day)) }
}

function toNativePayload(payload) {
  const data = {}
  if (IMPROVEMENTS.some(([id]) => id === payload.improvement)) data.wishes = [payload.improvement]
  if (SUPPORTS.some(([id]) => id === payload.support)) data.supportType = payload.support
  const birthdate = `${payload.year}-${payload.month}-${payload.day.padStart(2, '0')}`
  if (parseBirthdate(birthdate)) {
    data.birthdate = birthdate
    data.birthTimeIncluded = Boolean(payload.includeTime)
    data.birthTime = payload.includeTime ? payload.time : null
  }
  if (OPTION_IDS.pace.has(payload.pace)) data.pace = payload.pace
  if (OPTION_IDS.blessing.has(payload.blessing)) data.blessing = payload.blessing
  if (OPTION_IDS.innerState.has(payload.innerState)) data.block = payload.innerState
  if (OPTION_IDS.prompt.has(payload.prompt)) data.guardianPrompt = payload.prompt
  return data
}

function toNativeResumePayload(step, payload) {
  const progress = {
    wish_survey_2_completed: 3,
    birthdate: 1,
    wish_survey_2: 2,
    presence_presence: 3,
    presence_transition: 3,
    presence_blessing: 3,
    guardian_match: 3,
    guardian_first_interaction: 3,
    first_practice: 4,
  }[step] ?? 0
  const keys = [
    ['wishes', 'supportType'],
    ['birthdate', 'birthTimeIncluded', 'birthTime'],
    ['pace', 'blessing', 'block'],
    ['guardianPrompt'],
  ].slice(0, progress).flat()
  const data = toNativePayload(payload)
  return Object.fromEntries(keys.filter((key) => key in data).map((key) => [key, data[key]]))
}

function sanitizeCapabilities(value) {
  return Object.fromEntries(CAPABILITY_KEYS.map((key) => [key, value?.[key] === true]))
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  )

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(Boolean(media?.matches))
    media?.addEventListener?.('change', update)
    return () => media?.removeEventListener?.('change', update)
  }, [])

  return reduced
}

function LotusMark({ className = '' }) {
  return (
    <img
      className={`onboarding-lotus-mark ${className}`}
      src="/app-onboarding/header-lotus.webp"
      alt=""
      aria-hidden="true"
    />
  )
}

function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button className={`onboarding-button onboarding-button--primary ${className}`} type="button" {...props}>
      {children}
    </button>
  )
}

function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button className={`onboarding-button onboarding-button--secondary ${className}`} type="button" {...props}>
      {children}
    </button>
  )
}

function FlowHeader({ step, onBack, copy }) {
  const number = STEP_NUMBER[step]
  const progress = number ? number * 10 : 0

  return (
    <header
      className={`onboarding-flow-header ${number ? 'has-progress' : ''}`}
      style={{ '--flow-progress': `${progress}%`, '--flow-step': number ?? 0 }}
    >
      <button className="onboarding-back" type="button" onClick={onBack} aria-label={copy.flow.back}>
        <span aria-hidden="true">←</span>
      </button>
      {number ? (
        <p
          className="onboarding-flow-progress"
          role="progressbar"
          aria-label={copy.flow.progress}
          aria-valuemin="1"
          aria-valuemax="10"
          aria-valuenow={number}
          aria-valuetext={copy.flow.stepAria(number)}
        >
          {copy.flow.stepText(number)}
        </p>
      ) : <p>{copy.flow.secureLogin}</p>}
      <span aria-hidden="true" />
    </header>
  )
}

function StandardScreen({ step, onBack, copy, children, className = '' }) {
  return (
    <section className={`onboarding-screen onboarding-screen--standard ${className}`} data-step={step}>
      <FlowHeader step={step} onBack={onBack} copy={copy} />
      <div className="onboarding-screen__scroll">{children}</div>
    </section>
  )
}

function Heading({ title, subtitle, icon = true, className = '', motionBeat }) {
  return (
    <header className={`onboarding-heading ${className}`} data-motion-beat={motionBeat}>
      {icon ? <LotusMark /> : null}
      <h1 tabIndex="-1" data-onboarding-heading>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </header>
  )
}

function ChoiceButton({ children, selected, onClick, className = '' }) {
  return (
    <button
      className={`onboarding-choice ${selected ? 'is-selected' : ''} ${className}`}
      type="button"
      aria-pressed={selected}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function WelcomeScreen({ copy, onBegin, onEmail, onGuest, onSignIn, onLegal, embedded = false, capabilities = {}, busy = false }) {
  const heroRef = useRef(null)

  const handlePointerMove = (event) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rect = heroRef.current?.getBoundingClientRect()
    if (!rect) return
    heroRef.current.style.setProperty('--hero-x', `${((event.clientX - rect.left) / rect.width - 0.5) * 8}px`)
    heroRef.current.style.setProperty('--hero-y', `${((event.clientY - rect.top) / rect.height - 0.5) * 6}px`)
  }

  return (
    <section className="onboarding-screen onboarding-screen--welcome" aria-labelledby="onboarding-welcome-title">
      <div className="onboarding-welcome-scroll">
        <div
          ref={heroRef}
          className="onboarding-welcome-hero"
          data-motion-sequence="welcome"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => {
            heroRef.current?.style.setProperty('--hero-x', '0px')
            heroRef.current?.style.setProperty('--hero-y', '0px')
          }}
        >
          <div className="onboarding-welcome-hero__glow" data-motion-beat="glow" aria-hidden="true" />
          <img
            className="onboarding-welcome-hero__image"
            src="/app-onboarding/welcome-hero.webp"
            alt={copy.welcome.heroAlt}
            fetchPriority="high"
            decoding="async"
            data-motion-beat="visual"
          />
          <div className="onboarding-welcome-hero__veil" data-motion-beat="veil" aria-hidden="true" />
          <LotusMark className="onboarding-welcome-hero__lotus" />
          <div className="onboarding-light-dust" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
        </div>

        <div className="onboarding-welcome-content" data-motion-sequence="welcome-copy">
          <Heading
            motionBeat="copy"
            title={<span id="onboarding-welcome-title">{copy.welcome.title}</span>}
            subtitle={copy.welcome.subtitle}
          />
          <div className="onboarding-actions" data-motion-beat="actions">
            {!embedded ? <PrimaryButton disabled={busy} aria-busy={busy} onClick={onBegin}>{copy.welcome.begin}</PrimaryButton> : null}
            {!embedded || capabilities.emailOtp ? (
              <SecondaryButton disabled={busy} onClick={onEmail}>
                <img src="/app-onboarding/email-icon.svg" alt="" aria-hidden="true" />
                {copy.welcome.email}
              </SecondaryButton>
            ) : null}
            {embedded && capabilities.appleSignIn ? <SecondaryButton disabled={busy} onClick={() => onSignIn('apple')}>{copy.welcome.apple}</SecondaryButton> : null}
            {embedded && capabilities.googleSignIn ? <SecondaryButton disabled={busy} onClick={() => onSignIn('google')}>{copy.welcome.google}</SecondaryButton> : null}
            {!embedded || capabilities.guest ? <SecondaryButton disabled={busy} onClick={onGuest}>{copy.welcome.guest}</SecondaryButton> : null}
          </div>
          <p className="onboarding-legal" data-motion-beat="legal">
            {copy.welcome.legalPrefix}
            <a href="https://legal.buddhachat.online/terms" target="_blank" rel="noreferrer" onClick={(event) => onLegal(event, 'terms')}>{copy.welcome.terms}</a>
            {copy.welcome.legalJoin}
            <a href="https://legal.buddhachat.online/privacy" target="_blank" rel="noreferrer" onClick={(event) => onLegal(event, 'privacy')}>{copy.welcome.privacy}</a>
          </p>
        </div>
      </div>
    </section>
  )
}

function EmailScreen({ copy, onBack, onSuccess, embedded = false, requestNative }) {
  const [phase, setPhase] = useState('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    if (phase !== 'otp' || resendIn <= 0) return undefined
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [phase, resendIn])

  const requestCode = async (normalizedEmail) => {
    setIsSubmitting(true)
    setError('')
    try {
      if (embedded) await requestNative('auth.email.send_otp', { email: normalizedEmail })
      else await sendLoginCode(normalizedEmail)
      setAuthenticated(false)
      setPhase('otp')
      setResendIn(60)
    } catch {
      setError(copy.email.sendFailed)
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitEmail = async (event) => {
    event.preventDefault()
    const normalized = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      setError(copy.email.invalidEmail)
      return
    }
    setEmail(normalized)
    await requestCode(normalized)
  }

  const submitCode = async (event) => {
    event.preventDefault()
    if (!authenticated && !/^\d{6}$/.test(code)) {
      setError(copy.email.invalidCode)
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      if (!authenticated) {
        try {
          if (embedded) await requestNative('auth.email.verify_otp', { email, token: code })
          else await loginWithCode({ email, code })
          setAuthenticated(true)
        } catch {
          setError(copy.email.expiredCode)
          return
        }
      }
      try {
        await onSuccess()
      } catch {
        setError(copy.email.syncFailed)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <StandardScreen step="email" copy={copy} onBack={phase === 'email' ? onBack : () => {
      setAuthenticated(false)
      setPhase('email')
    }} className="onboarding-email">
      <div className="onboarding-email__brand"><LotusMark /><b>BUDDHACHAT</b></div>
      <Heading
        icon={false}
        title={phase === 'email' ? copy.email.titleEmail : copy.email.titleOtp}
        subtitle={phase === 'email' ? copy.email.subtitleEmail : copy.email.subtitleOtp(email)}
      />
      <form className="onboarding-form" onSubmit={phase === 'email' ? submitEmail : submitCode}>
        <label htmlFor="onboarding-auth-input">{phase === 'email' ? copy.email.emailLabel : copy.email.codeLabel}</label>
        <input
          id="onboarding-auth-input"
          type={phase === 'email' ? 'email' : 'text'}
          inputMode={phase === 'email' ? 'email' : 'numeric'}
          autoComplete={phase === 'email' ? 'email' : 'one-time-code'}
          value={phase === 'email' ? email : code}
          maxLength={phase === 'email' ? undefined : 6}
          placeholder={phase === 'email' ? 'your@email.com' : '000000'}
          onChange={(event) => phase === 'email' ? setEmail(event.target.value) : setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        {error ? <p className="onboarding-error" role="alert">{error}</p> : null}
        <PrimaryButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? copy.email.sending : phase === 'email' ? copy.email.send : authenticated ? copy.email.retrySync : copy.email.verify}
        </PrimaryButton>
        {phase === 'otp' ? (
          <button
            className="onboarding-text-button"
            type="button"
            disabled={isSubmitting || resendIn > 0}
            onClick={() => requestCode(email)}
          >
            {resendIn > 0 ? copy.email.resendWait(resendIn) : copy.email.resend}
          </button>
        ) : null}
      </form>
      <aside className="onboarding-note">{copy.email.note}</aside>
    </StandardScreen>
  )
}

function QuestsScreen({ copy, onBack, onContinue, onSelectQuest, completedCount = 0, busy = false }) {
  const quests = copy.quests.items
  const nextQuestIndex = Math.min(completedCount, 2)
  const statusFor = (index) => index < completedCount ? 'completed' : index === nextQuestIndex ? 'active' : 'locked'

  return (
    <StandardScreen step="quests" copy={copy} onBack={onBack} className="onboarding-quests">
      <Heading title={<>{copy.quests.title[0]}<br />{copy.quests.title[1]}</>} subtitle={copy.quests.subtitle} />
      <div className="onboarding-progress"><i style={{ width: `${Math.min(completedCount, 3) * (100 / 3)}%` }} /></div>
      <p className="onboarding-progress-copy">{copy.quests.progress(completedCount)}</p>
      <div className="onboarding-quest-list">
        {quests.map(([title, description], index) => {
          const status = statusFor(index)
          return (
            <button
              key={title}
              className={`onboarding-quest is-${status}`}
              type="button"
              disabled={busy || status === 'locked'}
              onClick={() => onSelectQuest(index)}
              aria-label={title}
            >
              <b>0{index + 1}</b><span><strong>{title}</strong><small>{description}</small></span>
              <em>{status === 'completed' ? copy.quests.status.completed : status === 'active' ? (index === 0 ? copy.quests.status.activeFirst : copy.quests.status.activeNext) : copy.quests.status.locked}</em>
            </button>
          )
        })}
      </div>
      <div className="onboarding-zen-tip">
        <div className="onboarding-zen-tip__art" aria-hidden="true">
          <img src="/app-onboarding/zen-tip-landscape.webp" alt="" loading="lazy" decoding="async" />
        </div>
        <span><b>{copy.quests.tipTitle}</b>{copy.quests.tipBody}</span>
      </div>
      <PrimaryButton disabled={busy} aria-busy={busy} onClick={onContinue}>{copy.quests.continue}</PrimaryButton>
    </StandardScreen>
  )
}

function WishOneScreen({ copy, payload, setPayload, onBack, onContinue, busy = false }) {
  const canContinue = payload.improvement && payload.support
  const improvements = optionPairs(IMPROVEMENT_IDS, copy.options.improvements)
  const supports = optionPairs(SUPPORT_IDS, copy.options.supports)
  return (
    <StandardScreen step="wish-one" copy={copy} onBack={onBack} className="onboarding-survey">
      <Heading icon={false} title={<>{copy.wishOne.title[0]}<br />{copy.wishOne.title[1]}</>} subtitle={copy.wishOne.subtitle} />
      <section className="onboarding-question-card">
        <p>01 / 02</p><h2>{copy.wishOne.questionImprovement}</h2>
        <div className="onboarding-choice-grid">
          {improvements.map(([id, label]) => <ChoiceButton key={id} selected={payload.improvement === id} onClick={() => setPayload({ improvement: id })}>{label}</ChoiceButton>)}
        </div>
      </section>
      <section className="onboarding-question-card onboarding-question-card--compact">
        <p>02 / 02</p><h2>{copy.wishOne.questionSupport}</h2>
        <div className="onboarding-chip-row">
          {supports.map(([id, label]) => <ChoiceButton key={id} selected={payload.support === id} onClick={() => setPayload({ support: id })}>{label}</ChoiceButton>)}
        </div>
      </section>
      <p className="onboarding-helper">{copy.wishOne.helper}</p>
      <PrimaryButton disabled={!canContinue || busy} aria-busy={busy} onClick={onContinue}>{copy.wishOne.continue}</PrimaryButton>
    </StandardScreen>
  )
}

function BirthdateScreen({ copy, payload, setPayload, onBack, onContinue, busy = false }) {
  const monthIndex = Number(payload.month) - 1
  const maxYear = new Date().getFullYear() - 13
  const maxDays = new Date(Number(payload.year), monthIndex + 1, 0).getDate()
  const birthdate = new Date(Number(payload.year), monthIndex, Number(payload.day))
  const oldestAllowed = new Date()
  oldestAllowed.setHours(23, 59, 59, 999)
  oldestAllowed.setFullYear(oldestAllowed.getFullYear() - 13)
  const isOldEnough = birthdate <= oldestAllowed

  const updateDate = (patch) => {
    const nextMonth = patch.month ?? payload.month
    const nextYear = patch.year ?? payload.year
    const nextMaxDays = new Date(Number(nextYear), Number(nextMonth), 0).getDate()
    setPayload({ ...patch, day: String(Math.min(Number(payload.day), nextMaxDays)) })
  }
  const months = monthPairs(copy.options.months)

  return (
    <StandardScreen step="birthdate" copy={copy} onBack={onBack} className="onboarding-birthdate">
      <Heading className="onboarding-heading--birthdate" title={<>{copy.birthdate.title[0]}<br />{copy.birthdate.title[1]}</>} subtitle={copy.birthdate.subtitle} />
      <section className="onboarding-form-card">
        <h2>{copy.birthdate.sectionTitle}</h2>
        <div className="onboarding-date-grid">
          <label>{copy.birthdate.month}<select aria-label={copy.birthdate.month} value={payload.month} onChange={(event) => updateDate({ month: event.target.value })}>{months.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label>{copy.birthdate.day}<select aria-label={copy.birthdate.day} value={payload.day} onChange={(event) => setPayload({ day: event.target.value })}>{Array.from({ length: maxDays }, (_, index) => String(index + 1)).map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>{copy.birthdate.year}<select aria-label={copy.birthdate.year} value={payload.year} onChange={(event) => updateDate({ year: event.target.value })}>{Array.from({ length: 100 }, (_, index) => String(maxYear - index)).map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <label className="onboarding-toggle-row">
          <span>{copy.birthdate.includeTime} <small>{copy.birthdate.optional}</small></span>
          <input type="checkbox" checked={payload.includeTime} onChange={(event) => setPayload({ includeTime: event.target.checked })} />
          <i aria-hidden="true" />
        </label>
        {payload.includeTime ? <label className="onboarding-time-label">{copy.birthdate.time}<input aria-label={copy.birthdate.time} type="time" value={payload.time} onChange={(event) => setPayload({ time: event.target.value })} /></label> : null}
      </section>
      <aside className="onboarding-note onboarding-note--gold">{copy.birthdate.note}</aside>
      {!isOldEnough ? <p className="onboarding-error" role="alert">{copy.birthdate.tooYoung}</p> : null}
      <PrimaryButton disabled={!isOldEnough || busy} aria-busy={busy} onClick={onContinue}>{copy.birthdate.continue}</PrimaryButton>
    </StandardScreen>
  )
}

function WishTwoScreen({ copy, payload, setPayload, onBack, onContinue, busy = false }) {
  const canContinue = payload.pace && payload.blessing && payload.innerState
  const groups = [
    ['pace', copy.wishTwo.questions.pace, optionPairs(PACE_IDS, copy.options.pace)],
    ['blessing', copy.wishTwo.questions.blessing, optionPairs(BLESSING_IDS, copy.options.blessing)],
    ['innerState', copy.wishTwo.questions.innerState, optionPairs(INNER_STATE_IDS, copy.options.innerState)],
  ]
  return (
    <StandardScreen step="wish-two" copy={copy} onBack={onBack} className="onboarding-survey onboarding-survey--two">
      <Heading icon={false} title={<>{copy.wishTwo.title[0]}<br />{copy.wishTwo.title[1]}</>} subtitle={copy.wishTwo.subtitle} />
      <div className="onboarding-question-rows">
        {groups.map(([key, title, options], index) => (
          <section key={key}>
            <h2><b>0{index + 1}</b>{title}</h2>
            <div className="onboarding-chip-row">
              {options.map(([id, label]) => <ChoiceButton key={id} selected={payload[key] === id} onClick={() => setPayload({ [key]: id })}>{label}</ChoiceButton>)}
            </div>
          </section>
        ))}
      </div>
      <div className="onboarding-selection-summary">{copy.wishTwo.summary}</div>
      <PrimaryButton disabled={!canContinue || busy} aria-busy={busy} onClick={onContinue}>{copy.wishTwo.reveal}</PrimaryButton>
    </StandardScreen>
  )
}

function PresenceScreen({ copy, onBack, onContinue, reducedMotion }) {
  const continueRef = useRef(onContinue)

  useEffect(() => {
    continueRef.current = onContinue
  }, [onContinue])

  useEffect(() => {
    const timer = window.setTimeout(() => continueRef.current(), 3000)
    return () => window.clearTimeout(timer)
  }, [reducedMotion])

  return (
    <section className="onboarding-screen onboarding-screen--presence" data-step="presence" data-motion-sequence="presence">
      <img className="onboarding-presence-art" src="/app-onboarding/presence-buddha.webp" alt={copy.presence.alt} data-motion-beat="visual" />
      <div className="onboarding-presence-light" data-motion-beat="light" aria-hidden="true" />
      <FlowHeader step="presence" onBack={onBack} copy={copy} />
      <div className="onboarding-presence-copy">
        <p data-motion-beat="eyebrow">{copy.presence.eyebrow}</p>
        <h1 tabIndex="-1" data-onboarding-heading data-motion-beat="title">{copy.presence.title}</h1>
        <div className="onboarding-breathing-orb" data-motion-beat="orb"><LotusMark /></div>
        <blockquote data-motion-beat="quote">{copy.presence.quote}</blockquote>
        <span data-motion-beat="status" aria-live="polite">{copy.presence.status}</span>
        <button className="onboarding-text-button" data-motion-beat="action" type="button" onClick={onContinue}>{copy.presence.skip}</button>
      </div>
    </section>
  )
}

function ResonanceScreen({ copy, onBack, onContinue, reducedMotion }) {
  const [completed, setCompleted] = useState(reducedMotion ? 3 : 0)
  const continueRef = useRef(onContinue)

  useEffect(() => {
    continueRef.current = onContinue
  }, [onContinue])

  useEffect(() => {
    if (reducedMotion) {
      const timer = window.setTimeout(() => continueRef.current(), 4200)
      return () => window.clearTimeout(timer)
    }
    const timers = [1, 2, 3].map((value) => window.setTimeout(() => setCompleted(value), value * 1200))
    timers.push(window.setTimeout(() => continueRef.current(), 4200))
    return () => timers.forEach(window.clearTimeout)
  }, [reducedMotion])

  const rows = copy.resonance.rows
  return (
    <StandardScreen step="resonance" copy={copy} onBack={onBack} className="onboarding-resonance">
      <div className="onboarding-resonance-art"><img src="/app-onboarding/transition-vortex.webp" alt={copy.resonance.alt} /></div>
      <Heading icon={false} title={<>{copy.resonance.title[0]}<br />{copy.resonance.title[1]}</>} subtitle={copy.resonance.subtitle} />
      <div className="onboarding-alignment-list">
        {rows.map(([title, subtitle], index) => {
          const state = completed > index ? 'complete' : index === completed ? 'working' : 'waiting'
          return (
            <div
              key={title}
              className={state === 'complete' ? 'is-complete' : state === 'working' ? 'is-working' : ''}
              data-state={state}
              style={{ '--alignment-index': index }}
            >
              <i /><span><b>{title}</b><small>{subtitle}</small></span><em>{state === 'complete' ? copy.resonance.state.complete : state === 'working' ? copy.resonance.state.working : copy.resonance.state.waiting}</em>
            </div>
          )
        })}
      </div>
      <p className="onboarding-auto-progress" aria-live="polite">{copy.resonance.auto}</p>
    </StandardScreen>
  )
}

function BlessingScreen({ copy, onBack, onContinue, reducedMotion }) {
  const continueRef = useRef(onContinue)

  useEffect(() => {
    continueRef.current = onContinue
  }, [onContinue])

  useEffect(() => {
    const timer = window.setTimeout(() => continueRef.current(), 3000)
    return () => window.clearTimeout(timer)
  }, [reducedMotion])

  return (
    <section className="onboarding-screen onboarding-screen--blessing" data-step="blessing" data-motion-sequence="blessing">
      <img className="onboarding-blessing-art" src="/app-onboarding/blessing-lotus.webp" alt={copy.blessing.alt} data-motion-beat="visual" />
      <div className="onboarding-blessing-beam" data-motion-beat="beam" aria-hidden="true" />
      <div className="onboarding-particles" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ '--i': index, '--particle-index': index }} />)}</div>
      <FlowHeader step="blessing" onBack={onBack} copy={copy} />
      <div className="onboarding-blessing-copy">
        <p data-motion-beat="eyebrow">{copy.blessing.eyebrow}</p>
        <h1 tabIndex="-1" data-onboarding-heading data-motion-beat="title">{copy.blessing.title[0]}<br />{copy.blessing.title[1]}</h1>
        <div className="onboarding-loading-ring" data-motion-beat="ring" role="status" aria-label={copy.blessing.loadingAria} />
        <h2 data-motion-beat="status">{copy.blessing.status}</h2><span data-motion-beat="caption">{copy.blessing.caption}</span>
        <div className="onboarding-loading-line" data-motion-beat="progress"><i /></div>
      </div>
    </section>
  )
}

const GUARDIANS = {
  emotional_peace: { id: 'amitabha' },
  relationships: { id: 'guanyin' },
  career: { id: 'akasagarbha' },
  health: { id: 'medicine-buddha' },
  wealth: { id: 'caishen' },
  protection: { id: 'ksitigarbha' },
  wisdom: { id: 'manjushri' },
}

const GUARDIAN_TYPES = new Set(Object.values(GUARDIANS).map(({ id }) => id))
const GUARDIAN_KEY_BY_TYPE = Object.fromEntries(Object.entries(GUARDIANS).map(([key, { id }]) => [id, key]))

function getBridgeErrorMessage(error, copy) {
  if (error?.code === 'timeout') return copy.bridge.timeout
  if (error?.code === 'unsupported') return copy.bridge.unsupported
  if (error?.code === 'unavailable') return copy.bridge.unavailable
  if (error?.code === 'guardian_unavailable') return copy.bridge.guardianFailed
  return copy.bridge.failed
}

function GuardianScreen({ copy, guardian, onBack, onMeet, onPractice, busy = false }) {
  return (
    <StandardScreen step="guardian" copy={copy} onBack={onBack} className="onboarding-guardian">
      <div className="onboarding-guardian-art" data-motion-sequence="guardian-reveal">
        <div className="onboarding-guardian-portal" data-motion-beat="portal" aria-hidden="true" />
        <img src={`/app-onboarding/${guardian.id}-full.webp`} alt={guardian.name} decoding="async" data-motion-beat="visual" />
      </div>
      <div className="onboarding-guardian-copy" data-motion-sequence="guardian-copy">
        <span data-motion-beat="eyebrow">{copy.guardian.eyebrow}</span>
        <h1 tabIndex="-1" data-onboarding-heading data-motion-beat="title">{copy.guardian.title}</h1>
        <h2 data-motion-beat="name">{guardian.name}</h2>
        <p data-motion-beat="traits">{guardian.traits}</p><small data-motion-beat="reason">{guardian.reason}</small>
        <PrimaryButton data-motion-beat="primary-action" disabled={busy} aria-busy={busy} onClick={onMeet}>{copy.guardian.meet}</PrimaryButton>
        <SecondaryButton data-motion-beat="secondary-action" disabled={busy} onClick={onPractice}>{copy.guardian.practice}</SecondaryButton>
      </div>
    </StandardScreen>
  )
}

function ConversationScreen({ copy, guardian, payload, setPayload, onBack, onBegin, onPractice, busy = false }) {
  const prompts = optionPairs(PROMPT_IDS, copy.options.prompts)
  return (
    <StandardScreen step="conversation" copy={copy} onBack={onBack} className="onboarding-conversation">
      <div className="onboarding-guardian-profile">
        <img src={`/app-onboarding/${guardian.id}-full.webp`} alt={`${guardian.name}${copy.conversation.avatarSuffix}`} decoding="async" />
        <span><small>{copy.conversation.profileLabel}</small><h1 tabIndex="-1" data-onboarding-heading>{guardian.name}</h1><p>{guardian.traits}</p></span>
      </div>
      <blockquote>{guardian.greeting}<small>{copy.conversation.now}</small></blockquote>
      <h2>{copy.conversation.title}</h2>
      <div className="onboarding-prompt-list">
        {prompts.map(([id, label]) => <ChoiceButton key={id} selected={payload.prompt === id} onClick={() => setPayload({ prompt: id })}>{label}</ChoiceButton>)}
      </div>
      <PrimaryButton disabled={busy} aria-busy={busy} onClick={onBegin}>{copy.conversation.begin}</PrimaryButton>
      <button className="onboarding-text-button" type="button" disabled={busy} onClick={onPractice}>{copy.conversation.practice}</button>
    </StandardScreen>
  )
}

function PracticeScreen({ copy, onBack, onMeet, onComplete, busy = false }) {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return undefined
    const timer = window.setInterval(() => {
      setElapsed((value) => {
        const next = Math.min(value + 1, 30)
        if (next === 30) setRunning(false)
        return next
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [running])

  const remaining = 30 - elapsed
  const progress = elapsed / 30
  return (
    <StandardScreen step="practice" copy={copy} onBack={onBack} className="onboarding-practice">
      <Heading icon={false} title={copy.practice.title} subtitle={copy.practice.subtitle} />
      <div className="onboarding-timer" style={{ '--progress': `${progress * 360}deg` }}>
        <span><b>00:{String(remaining).padStart(2, '0')}</b><small>{elapsed === 30 ? copy.practice.completeStatus : running ? copy.practice.breathing : copy.practice.ready}</small></span>
      </div>
      <section className="onboarding-checklist">
        <h2>{copy.practice.checklistTitle}</h2>
        {copy.practice.checklist.map((item, index) => <p key={item} className={elapsed >= (index + 1) * 10 ? 'is-done' : ''}><i>{elapsed >= (index + 1) * 10 ? '✓' : ''}</i>{item}</p>)}
      </section>
      {elapsed >= 30 ? (
        <PrimaryButton disabled={busy} aria-busy={busy} onClick={onComplete}>{copy.practice.complete}</PrimaryButton>
      ) : (
        <PrimaryButton disabled={busy} onClick={() => setRunning((value) => !value)}>{running ? copy.practice.pause : elapsed ? copy.practice.resume : copy.practice.start}</PrimaryButton>
      )}
      <button className="onboarding-text-button" type="button" disabled={busy} onClick={onMeet}>{copy.practice.meet}</button>
    </StandardScreen>
  )
}

function CompleteScreen({ copy, guest = false, onRestart, busy = false, embedded = false }) {
  return (
    <section className="onboarding-screen onboarding-screen--complete">
      <div className="onboarding-complete-halo"><LotusMark /></div>
      <Heading
        icon={false}
        title={guest ? copy.complete.guestTitle : copy.complete.title}
        subtitle={guest ? copy.complete.guestSubtitle : copy.complete.subtitle}
      />
      {!embedded && <PrimaryButton disabled={busy} aria-busy={busy} onClick={onRestart}>{copy.complete.restart}</PrimaryButton>}
      {!embedded && <a className="onboarding-home-link" href="/">{copy.complete.home}</a>}
    </section>
  )
}

export default function AppOnboardingWelcomePage() {
  const reducedMotion = useReducedMotion()
  const shellRef = useRef(null)
  const embedded = new URLSearchParams(window.location.search).get('embedded') === '1'
  const bridgeMessageNumber = useRef(0)
  const bridgeReadyId = useRef('')
  const bridgeReadySent = useRef(false)
  const lastReadyStep = useRef('')
  const bridgeRequests = useRef(new Map())
  const actionPending = useRef(false)
  const retryAction = useRef(null)
  const guardianResolveStarted = useRef(false)
  const runNativeActionRef = useRef(null)
  const nativeBackRef = useRef(null)
  const mounted = useRef(true)
  const [step, setStep] = useState(() => embedded ? 'welcome' : readInitialStep())
  const initialStep = useRef(step)
  const [direction, setDirection] = useState('forward')
  const [payload, setPayloadState] = useState(() => embedded ? { ...DEFAULT_PAYLOAD } : readInitialPayload())
  const [nativeBootstrap, setNativeBootstrap] = useState({ ready: false, locale: 'zh-Hans', capabilities: {} })
  const locale = normalizeOnboardingLocale(nativeBootstrap.locale)
  const copy = getOnboardingCopy(locale)
  const [completedQuests, setCompletedQuests] = useState(0)
  const [pendingAction, setPendingAction] = useState(false)
  const [bridgeError, setBridgeError] = useState('')
  const guardianKey = GUARDIAN_KEY_BY_TYPE[payload.guardianType] ?? (payload.improvement in GUARDIANS ? payload.improvement : 'relationships')
  const guardian = { ...GUARDIANS[guardianKey], ...copy.guardians[guardianKey] }
  const historyDepth = useRef(0)

  useEffect(() => {
    if (!embedded) return undefined
    const handleNativeMessage = (event) => {
      try {
        const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
        if (
          message?.v !== 1
          || typeof message.event !== 'string'
          || typeof message.id !== 'string'
          || !message.payload
          || typeof message.payload !== 'object'
          || Array.isArray(message.payload)
        ) return
        if (message.type === 'ack' || message.type === 'error') {
          const pending = bridgeRequests.current.get(message.id)
          if (!pending || pending.event !== message.event) return
          bridgeRequests.current.delete(message.id)
          window.clearTimeout(pending.timer)
          if (message.type === 'ack') pending.resolve(message.payload ?? {})
          else pending.reject(message.payload ?? {})
          return
        }
        if (
          message.type !== 'bootstrap'
          || message.event !== 'bridge.bootstrap'
          || message.id !== bridgeReadyId.current
        ) return
        const nextStep = NATIVE_STEP_TO_H5[message.payload?.initialStep]
        const nativePayload = message.payload?.payload ?? {}
        const improvement = IMPROVEMENTS.some(([id]) => id === nativePayload.wishes?.[0]) ? nativePayload.wishes[0] : ''
        const support = SUPPORTS.some(([id]) => id === nativePayload.supportType) ? nativePayload.supportType : ''
        const birthdate = parseBirthdate(nativePayload.birthdate)
        const birthTimeIncluded = nativePayload.birthTimeIncluded === true
        const birthTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(nativePayload.birthTime ?? '') ? nativePayload.birthTime : DEFAULT_PAYLOAD.time
        const pace = OPTION_IDS.pace.has(nativePayload.pace) ? nativePayload.pace : ''
        const blessing = OPTION_IDS.blessing.has(nativePayload.blessing) ? nativePayload.blessing : ''
        const innerState = OPTION_IDS.innerState.has(nativePayload.block) ? nativePayload.block : ''
        const prompt = OPTION_IDS.prompt.has(nativePayload.guardianPrompt) ? nativePayload.guardianPrompt : ''
        setCompletedQuests(improvement && support ? (birthdate ? (pace && blessing && innerState ? 3 : 2) : 1) : 0)
        if (nextStep) setStep(nextStep)
        setPayloadState((current) => ({
          ...current,
          ...(improvement ? { improvement } : {}),
          ...(support ? { support } : {}),
          ...(birthdate ?? {}),
          ...(typeof nativePayload.birthTimeIncluded === 'boolean' ? { includeTime: birthTimeIncluded } : {}),
          ...(birthTimeIncluded ? { time: birthTime } : {}),
          ...(pace ? { pace } : {}),
          ...(blessing ? { blessing } : {}),
          ...(innerState ? { innerState } : {}),
          ...(prompt ? { prompt } : {}),
          ...(GUARDIAN_TYPES.has(nativePayload.guardianType) ? { guardianType: nativePayload.guardianType } : {}),
        }))
        setNativeBootstrap({
          ready: true,
          locale: normalizeOnboardingLocale(message.payload?.locale),
          capabilities: sanitizeCapabilities(message.payload?.capabilities),
        })
      } catch {
        // Ignore messages outside the versioned native bridge contract.
      }
    }
    window.addEventListener('message', handleNativeMessage)
    document.addEventListener('message', handleNativeMessage)
    return () => {
      window.removeEventListener('message', handleNativeMessage)
      document.removeEventListener('message', handleNativeMessage)
    }
  }, [embedded])

  useEffect(() => {
    mounted.current = true
    const requests = bridgeRequests.current
    return () => {
      mounted.current = false
      requests.forEach(({ timer, reject }) => {
        window.clearTimeout(timer)
        reject({ code: 'unmounted', message: '', retryable: false })
      })
      requests.clear()
    }
  }, [])

  const requestNative = (event, requestPayload) => {
    if (!embedded) return Promise.resolve({})
    if (!BRIDGE_EVENTS.has(event)) return Promise.reject({ code: 'unsupported' })
    if (typeof window.ReactNativeWebView?.postMessage !== 'function') {
      return Promise.reject({ code: 'unavailable' })
    }
    const id = createBridgeMessageId(++bridgeMessageNumber.current)
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        if (!bridgeRequests.current.delete(id)) return
        reject({ code: 'timeout', retryable: true })
      }, event.startsWith('auth.') ? BRIDGE_AUTH_TIMEOUT_MS : BRIDGE_ACK_TIMEOUT_MS)
      bridgeRequests.current.set(id, { event, resolve, reject, timer })
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({ v: 1, type: 'event', event, id, payload: requestPayload }))
      } catch {
        window.clearTimeout(timer)
        bridgeRequests.current.delete(id)
        reject({ code: 'unavailable' })
      }
    })
  }

  const runNativeAction = async (event, requestPayload, onAck) => {
    if (actionPending.current) return
    if (!embedded) {
      await onAck({})
      return
    }
    retryAction.current = () => runNativeAction(event, requestPayload, onAck)
    actionPending.current = true
    setPendingAction(true)
    setBridgeError('')
    try {
      const response = await requestNative(event, requestPayload)
      await onAck(response)
      retryAction.current = null
    } catch (error) {
      if (mounted.current) setBridgeError(getBridgeErrorMessage(error, copy))
    } finally {
      actionPending.current = false
      if (mounted.current) setPendingAction(false)
    }
  }
  runNativeActionRef.current = runNativeAction

  useEffect(() => {
    if (
      !embedded
      || !nativeBootstrap.ready
      || step !== 'guardian'
      || GUARDIAN_TYPES.has(payload.guardianType)
      || guardianResolveStarted.current
    ) return
    guardianResolveStarted.current = true
    runNativeActionRef.current('guardian.resolve', {}, ({ guardianType }) => {
      if (!GUARDIAN_TYPES.has(guardianType)) throw { code: 'guardian_unavailable' }
      setPayloadState((current) => ({ ...current, guardianType }))
    })
  }, [embedded, nativeBootstrap.ready, payload.guardianType, step])

  useEffect(() => {
    if (!embedded || bridgeReadySent.current) return
    bridgeReadySent.current = true
    const id = createBridgeMessageId(++bridgeMessageNumber.current)
    bridgeReadyId.current = id
    window.ReactNativeWebView?.postMessage(JSON.stringify({
      v: 1,
      type: 'event',
      event: 'bridge.ready',
      id,
      payload: {},
    }))
    return () => {
      bridgeReadySent.current = false
    }
  }, [embedded])

  useEffect(() => {
    const nativeStep = H5_STEP_TO_NATIVE[step]
    if (!embedded || !nativeBootstrap.ready || !nativeStep || lastReadyStep.current === nativeStep) return
    lastReadyStep.current = nativeStep
    const id = createBridgeMessageId(++bridgeMessageNumber.current)
    try {
      window.ReactNativeWebView?.postMessage(JSON.stringify({
        v: 1,
        type: 'event',
        event: 'onboarding.step_ready',
        id,
        payload: { step: nativeStep },
      }))
    } catch {
      // Readiness is diagnostic and must never block the onboarding flow.
    }
  }, [embedded, nativeBootstrap.ready, step])

  useEffect(() => {
    const preloadSteps = ['presence-buddha', 'transition-vortex', 'blessing-lotus', `${guardian.id}-full`]
    preloadSteps.forEach((name) => {
      const image = new Image()
      image.src = `/app-onboarding/${name}.webp`
    })
  }, [guardian.id])

  useEffect(() => {
    if (embedded) return
    window.history.replaceState({ onboardingStep: initialStep.current, onboardingDepth: 0 }, '')
  }, [embedded])

  useEffect(() => {
    if (embedded) {
      window.localStorage.removeItem(STORAGE.step)
      return
    }
    window.localStorage.setItem(STORAGE.step, step)
  }, [embedded, step])

  useEffect(() => {
    if (embedded) {
      window.localStorage.removeItem(STORAGE.payload)
      return
    }
    window.localStorage.setItem(STORAGE.payload, JSON.stringify(payload))
  }, [embedded, payload])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    shell.scrollTop = 0
    shell.querySelectorAll('.onboarding-screen__scroll').forEach((region) => {
      region.scrollTop = 0
    })
  }, [step])

  const setPayload = (patch) => setPayloadState((current) => ({ ...current, ...patch }))
  const go = (next, nextDirection = 'forward') => {
    setDirection(nextDirection)
    setStep(next)
    if (embedded) return
    const nextDepth = historyDepth.current + 1
    historyDepth.current = nextDepth
    window.history.pushState({ onboardingStep: next, onboardingDepth: nextDepth }, '')
  }

  const goBack = (previous) => {
    if (embedded) {
      runNativeAction('onboarding.persist', {
        step: H5_STEP_TO_NATIVE[previous],
        data: toNativeResumePayload(H5_STEP_TO_NATIVE[previous], payload),
      }, () => {
        setDirection('back')
        setStep(previous)
      })
      return
    }
    if (historyDepth.current > 0) {
      window.history.back()
      return
    }
    setDirection('back')
    setStep(previous)
    window.history.replaceState({ onboardingStep: previous, onboardingDepth: historyDepth.current }, '')
  }

  const backMap = useMemo(() => ({
    email: 'welcome', quests: 'welcome', 'wish-one': 'quests', birthdate: 'wish-one', 'wish-two': 'birthdate',
    presence: 'wish-two', resonance: 'presence', blessing: 'resonance', guardian: 'blessing', conversation: 'guardian', practice: 'conversation',
  }), [])
  nativeBackRef.current = () => {
    const previous = backMap[step]
    if (previous) goBack(previous)
  }

  const complete = () => {
    window.localStorage.setItem(STORAGE.completed, 'true')
    go('complete')
  }

  const restart = () => {
    Object.values(STORAGE).forEach((key) => window.localStorage.removeItem(key))
    setPayloadState(DEFAULT_PAYLOAD)
    go('welcome', 'back')
  }

  const revealGuardian = () => {
    if (!embedded) {
      go('guardian')
      return
    }
    if (GUARDIAN_TYPES.has(payload.guardianType)) {
      runNativeAction('onboarding.persist', {
        step: 'guardian_match',
        data: toNativeResumePayload('guardian_match', payload),
      }, () => go('guardian'))
      return
    }
    runNativeAction('guardian.resolve', {}, async ({ guardianType }) => {
      if (!GUARDIAN_TYPES.has(guardianType)) throw { code: 'guardian_unavailable' }
      setPayload({ guardianType })
      await requestNative('onboarding.persist', {
        step: 'guardian_match',
        data: toNativeResumePayload('guardian_match', payload),
      })
      go('guardian')
    })
  }

  const startConversation = () => {
    if (!embedded) {
      complete()
      return
    }
    runNativeAction('onboarding.persist', {
      step: 'guardian_first_interaction',
      data: toNativePayload(payload),
    }, async () => {
      await requestNative('onboarding.complete', {})
      await requestNative('navigation.open', { destination: 'ask' })
    })
  }

  const signIn = (provider) => runNativeAction('auth.sign_in', { provider }, async () => {
    await requestNative('onboarding.persist', { step: 'quests', data: {} })
    go('quests')
  })

  const exploreAsGuest = () => {
    if (!embedded) {
      window.localStorage.setItem(STORAGE.guestBypassed, 'true')
      go('guest-home')
      return
    }
    runNativeAction('guest.explore', {}, () => {})
  }

  const openLegal = (event, target) => {
    if (!embedded) return
    event.preventDefault()
    runNativeAction('navigation.external', { target }, () => {})
  }

  const finishPractice = () => {
    if (!embedded) {
      complete()
      return
    }
    runNativeAction('onboarding.complete', { firstPracticeDurationSeconds: 30 }, () => {})
  }

  const selectQuest = (index) => {
    const targets = [
      ['wish_survey_1', {}, 'wish-one'],
      ['birthdate', toNativeResumePayload('birthdate', payload), 'birthdate'],
      ['wish_survey_2', toNativeResumePayload('wish_survey_2', payload), 'wish-two'],
    ]
    const [nativeStep, data, h5Step] = targets[index]
    runNativeAction('onboarding.persist', { step: nativeStep, data }, () => go(h5Step))
  }

  const continueFromQuests = () => {
    if (completedQuests < 3) {
      selectQuest(completedQuests)
      return
    }
    runNativeAction('onboarding.persist', {
      step: 'presence_presence',
      data: toNativeResumePayload('presence_presence', payload),
    }, () => go('presence'))
  }

  const screens = {
    welcome: <WelcomeScreen
      copy={copy}
      busy={pendingAction}
      embedded={embedded}
      capabilities={nativeBootstrap.capabilities}
      onBegin={() => runNativeAction('onboarding.persist', { step: 'quests', data: {} }, () => go('quests'))}
      onEmail={() => runNativeAction('onboarding.persist', { step: 'email', data: {} }, () => go('email'))}
      onSignIn={signIn}
      onLegal={openLegal}
      onGuest={exploreAsGuest}
    />,
    email: <EmailScreen
      copy={copy}
      embedded={embedded}
      requestNative={requestNative}
      onBack={() => goBack('welcome')}
      onSuccess={async () => {
        if (embedded) await requestNative('onboarding.persist', { step: 'quests', data: {} })
        go('quests')
      }}
    />,
    quests: <QuestsScreen
      copy={copy}
      busy={pendingAction}
      completedCount={completedQuests}
      onBack={() => goBack('welcome')}
      onSelectQuest={selectQuest}
      onContinue={continueFromQuests}
    />,
    'wish-one': <WishOneScreen
      copy={copy}
      payload={payload}
      setPayload={setPayload}
      busy={pendingAction}
      onBack={() => goBack('quests')}
      onContinue={() => runNativeAction('onboarding.persist', {
        step: 'wish_survey_1_completed',
        data: { wishes: [payload.improvement], supportType: payload.support },
      }, () => {
        setCompletedQuests((count) => Math.max(count, 1))
        go('birthdate')
      })}
    />,
    birthdate: <BirthdateScreen
      copy={copy}
      payload={payload}
      setPayload={setPayload}
      busy={pendingAction}
      onBack={() => goBack('wish-one')}
      onContinue={() => runNativeAction('onboarding.persist', {
        step: 'birthdate_completed',
        data: {
          wishes: [payload.improvement],
          supportType: payload.support,
          birthdate: `${payload.year}-${payload.month}-${payload.day.padStart(2, '0')}`,
          birthTimeIncluded: payload.includeTime,
          birthTime: payload.includeTime ? payload.time : null,
        },
      }, () => {
        setCompletedQuests((count) => Math.max(count, 2))
        go('wish-two')
      })}
    />,
    'wish-two': <WishTwoScreen
      copy={copy}
      payload={payload}
      setPayload={setPayload}
      busy={pendingAction}
      onBack={() => goBack('birthdate')}
      onContinue={() => runNativeAction('onboarding.persist', {
        step: 'wish_survey_2_completed',
        data: toNativeResumePayload('wish_survey_2_completed', payload),
      }, () => {
        setCompletedQuests(3)
        go('presence')
      })}
    />,
    presence: <PresenceScreen
      copy={copy}
      reducedMotion={reducedMotion}
      onBack={() => goBack('wish-two')}
      onContinue={() => runNativeAction('onboarding.persist', {
        step: 'presence_transition',
        data: toNativeResumePayload('presence_transition', payload),
      }, () => go('resonance'))}
    />,
    resonance: <ResonanceScreen
      copy={copy}
      reducedMotion={reducedMotion}
      onBack={() => goBack('presence')}
      onContinue={() => runNativeAction('onboarding.persist', {
        step: 'presence_blessing',
        data: toNativeResumePayload('presence_blessing', payload),
      }, () => go('blessing'))}
    />,
    blessing: <BlessingScreen copy={copy} reducedMotion={reducedMotion} onBack={() => goBack('resonance')} onContinue={revealGuardian} />,
    guardian: embedded && !GUARDIAN_TYPES.has(payload.guardianType) ? (
      <section className="onboarding-screen onboarding-bridge-loading" role="status">{copy.bridge.guardianLoading}</section>
    ) : <GuardianScreen
      copy={copy}
      guardian={guardian}
      busy={pendingAction}
      onBack={() => goBack('blessing')}
      onMeet={() => runNativeAction('onboarding.persist', {
        step: 'guardian_first_interaction',
        data: toNativePayload(payload),
      }, () => go('conversation'))}
      onPractice={() => runNativeAction('onboarding.persist', {
        step: 'first_practice',
        data: toNativePayload(payload),
      }, () => go('practice'))}
    />,
    conversation: <ConversationScreen
      copy={copy}
      guardian={guardian}
      payload={payload}
      setPayload={setPayload}
      busy={pendingAction}
      onBack={() => goBack('guardian')}
      onBegin={startConversation}
      onPractice={() => runNativeAction('onboarding.persist', {
        step: 'first_practice',
        data: toNativePayload(payload),
      }, () => go('practice'))}
    />,
    practice: <PracticeScreen
      copy={copy}
      busy={pendingAction}
      onBack={() => goBack('conversation')}
      onMeet={() => goBack('conversation')}
      onComplete={finishPractice}
    />,
    complete: <CompleteScreen copy={copy} embedded={embedded} busy={pendingAction} onRestart={restart} />,
    'guest-home': <CompleteScreen copy={copy} embedded={embedded} guest busy={pendingAction} onRestart={restart} />,
  }

  useEffect(() => {
    if (!embedded) return undefined
    const handleNativeBack = () => nativeBackRef.current?.()
    window.addEventListener('buddhachat:native-back', handleNativeBack)
    return () => window.removeEventListener('buddhachat:native-back', handleNativeBack)
  }, [embedded])

  useEffect(() => {
    const handlePopState = (event) => {
      const previous = VALID_STEPS.has(event.state?.onboardingStep) ? event.state.onboardingStep : backMap[step]
      if (previous) {
        const finish = () => {
          historyDepth.current = Number.isInteger(event.state?.onboardingDepth) ? event.state.onboardingDepth : 0
          setDirection('back')
          setStep(previous)
        }
        if (embedded) {
          runNativeActionRef.current('onboarding.persist', {
            step: H5_STEP_TO_NATIVE[previous],
            data: toNativeResumePayload(H5_STEP_TO_NATIVE[previous], payload),
          }, finish)
        } else finish()
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [backMap, embedded, payload, step])

  return (
    <main className="app-onboarding" lang={locale}>
      <span className="sr-only" aria-live="polite" aria-atomic="true">{copy.announcements[step]}</span>
      <div ref={shellRef} key={step} className={`app-onboarding__shell is-${direction}`}>
        {embedded && !nativeBootstrap.ready
          ? <section className="onboarding-screen onboarding-bridge-loading" role="status">{copy.bridge.appLoading}</section>
          : screens[step] ?? screens.welcome}
      </div>
      {bridgeError ? (
        <aside className="onboarding-bridge-error" role="alert">
          <span>{bridgeError}</span>
          {retryAction.current ? <button type="button" disabled={pendingAction} onClick={() => retryAction.current?.()}>{copy.bridge.retry}</button> : null}
        </aside>
      ) : null}
    </main>
  )
}
