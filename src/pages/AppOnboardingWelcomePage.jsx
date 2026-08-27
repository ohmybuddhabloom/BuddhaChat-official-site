import { useEffect, useMemo, useRef, useState } from 'react'

import { loginWithCode, sendLoginCode } from '../lib/fusionAuth.js'
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
const STEP_ANNOUNCEMENT = {
  welcome: '欢迎', email: '邮箱登录', quests: '你的清净之路', 'wish-one': '告诉我们你内心所求',
  birthdate: '出生信息', 'wish-two': '你希望如何被陪伴', presence: '佛的临在', resonance: '正在校准共鸣',
  blessing: '正在准备你的守护佛', guardian: '守护佛已显现', conversation: '与守护佛初次对话',
  practice: '30 秒安住练习', complete: '你已经开始了', 'guest-home': '游客体验已开启',
}

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

const IMPROVEMENTS = [
  ['emotional_peace', '情绪平静'],
  ['relationships', '人际关系'],
  ['career', '事业'],
  ['health', '健康'],
  ['wealth', '财富'],
  ['protection', '守护'],
  ['wisdom', '智慧'],
]

const SUPPORTS = [
  ['listening', '倾听'],
  ['guidance', '指引'],
  ['encouragement', '鼓励'],
  ['clarity', '清明'],
]

const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  .map((label, index) => [String(index + 1).padStart(2, '0'), label])

const PACE_OPTIONS = [['gentle', '温和'], ['direct', '直接'], ['daily', '每日']]
const BLESSING_OPTIONS = [['peace', '平安'], ['good_fortune', '好运'], ['courage', '勇气'], ['wisdom', '智慧']]
const INNER_STATE_OPTIONS = [['anxiety', '焦虑'], ['confusion', '迷茫'], ['pressure', '压力'], ['attachment', '执着']]
const PROMPTS = [['peace', '我寻求平静'], ['guide', '请指引我'], ['know', '今天我应该知道什么？']]

const OPTION_IDS = {
  pace: new Set(PACE_OPTIONS.map(([id]) => id)),
  blessing: new Set(BLESSING_OPTIONS.map(([id]) => id)),
  innerState: new Set(INNER_STATE_OPTIONS.map(([id]) => id)),
  prompt: new Set(PROMPTS.map(([id]) => id)),
}

const CAPABILITY_KEYS = ['emailOtp', 'appleSignIn', 'googleSignIn', 'guest', 'guardian', 'ask', 'practice']

const LEGACY_IMPROVEMENT_IDS = Object.fromEntries(IMPROVEMENTS.map(([id, label]) => [label, id]))
const LEGACY_SUPPORT_IDS = Object.fromEntries(SUPPORTS.map(([id, label]) => [label, id]))

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
  const legacyMonth = MONTHS.find(([, label]) => label === saved.month)?.[0]
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

function FlowHeader({ step, onBack }) {
  const number = STEP_NUMBER[step]
  const progress = number ? number * 10 : 0

  return (
    <header
      className={`onboarding-flow-header ${number ? 'has-progress' : ''}`}
      style={{ '--flow-progress': `${progress}%`, '--flow-step': number ?? 0 }}
    >
      <button className="onboarding-back" type="button" onClick={onBack} aria-label="返回">
        <span aria-hidden="true">←</span>
      </button>
      {number ? (
        <p
          className="onboarding-flow-progress"
          role="progressbar"
          aria-label="引导进度"
          aria-valuemin="1"
          aria-valuemax="10"
          aria-valuenow={number}
          aria-valuetext={`第 ${number} 步，共 10 步`}
        >
          ✦ 第 {number} 步，共 10 步 ✦
        </p>
      ) : <p>安全登录</p>}
      <span aria-hidden="true" />
    </header>
  )
}

function StandardScreen({ step, onBack, children, className = '' }) {
  return (
    <section className={`onboarding-screen onboarding-screen--standard ${className}`} data-step={step}>
      <FlowHeader step={step} onBack={onBack} />
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

function WelcomeScreen({ onBegin, onEmail, onGuest, onSignIn, onLegal, embedded = false, capabilities = {}, busy = false }) {
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
          alt="佛陀端坐莲花之上，周围环绕柔和金光与山云"
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
          title={<span id="onboarding-welcome-title">开启你的清净之旅</span>}
          subtitle="用几分钟，找到与你此刻愿望相应的守护佛。"
        />
        <div className="onboarding-actions" data-motion-beat="actions">
          {!embedded ? <PrimaryButton disabled={busy} aria-busy={busy} onClick={onBegin}>开始探索</PrimaryButton> : null}
          {!embedded || capabilities.emailOtp ? (
            <SecondaryButton disabled={busy} onClick={onEmail}>
              <img src="/app-onboarding/email-icon.svg" alt="" aria-hidden="true" />
              使用邮箱继续
            </SecondaryButton>
          ) : null}
          {embedded && capabilities.appleSignIn ? <SecondaryButton disabled={busy} onClick={() => onSignIn('apple')}>使用 Apple 继续</SecondaryButton> : null}
          {embedded && capabilities.googleSignIn ? <SecondaryButton disabled={busy} onClick={() => onSignIn('google')}>使用 Google 继续</SecondaryButton> : null}
          {!embedded || capabilities.guest ? <SecondaryButton disabled={busy} onClick={onGuest}>游客体验</SecondaryButton> : null}
        </div>
        <p className="onboarding-legal" data-motion-beat="legal">
          继续即表示你同意
          <a href="https://legal.buddhachat.online/terms" target="_blank" rel="noreferrer" onClick={(event) => onLegal(event, 'terms')}>服务条款</a>
          与
          <a href="https://legal.buddhachat.online/privacy" target="_blank" rel="noreferrer" onClick={(event) => onLegal(event, 'privacy')}>隐私政策</a>
        </p>
      </div>
    </section>
  )
}

function EmailScreen({ onBack, onSuccess, embedded = false, requestNative }) {
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
      setError('验证码发送失败，请稍后再试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitEmail = async (event) => {
    event.preventDefault()
    const normalized = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      setError('请输入有效的邮箱地址')
      return
    }
    setEmail(normalized)
    await requestCode(normalized)
  }

  const submitCode = async (event) => {
    event.preventDefault()
    if (!authenticated && !/^\d{6}$/.test(code)) {
      setError('请输入 6 位验证码')
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
          setError('验证码无效或已过期，请重新输入')
          return
        }
      }
      try {
        await onSuccess()
      } catch {
        setError('登录成功，但同步进度失败，请重试')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <StandardScreen step="email" onBack={phase === 'email' ? onBack : () => {
      setAuthenticated(false)
      setPhase('email')
    }} className="onboarding-email">
      <div className="onboarding-email__brand"><LotusMark /><b>BUDDHACHAT</b></div>
      <Heading
        icon={false}
        title={phase === 'email' ? '使用邮箱继续' : '输入邮箱验证码'}
        subtitle={phase === 'email' ? '我们会发送一次性验证码来验证你的邮箱。' : `验证码已发送至 ${email}`}
      />
      <form className="onboarding-form" onSubmit={phase === 'email' ? submitEmail : submitCode}>
        <label htmlFor="onboarding-auth-input">{phase === 'email' ? '邮箱地址' : '6 位验证码'}</label>
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
          {isSubmitting ? '请稍候…' : phase === 'email' ? '发送验证码' : authenticated ? '重试同步' : '验证并继续'}
        </PrimaryButton>
        {phase === 'otp' ? (
          <button
            className="onboarding-text-button"
            type="button"
            disabled={isSubmitting || resendIn > 0}
            onClick={() => requestCode(email)}
          >
            {resendIn > 0 ? `${resendIn} 秒后可重新发送` : '重新发送验证码'}
          </button>
        ) : null}
      </form>
      <aside className="onboarding-note">邮箱仅用于账户验证与跨设备同步，不会公开展示。</aside>
    </StandardScreen>
  )
}

function QuestsScreen({ onBack, onContinue, onSelectQuest, completedCount = 0, busy = false }) {
  const quests = [
    ['分享你的心愿', '澄清你所求，安放真实发心。'],
    ['完善出生信息', '加深共鸣，让守护匹配更贴近你。'],
    ['深化你的心愿', '选择你想要的陪伴、祝福与内在状态。'],
  ]
  const nextQuestIndex = Math.min(completedCount, 2)
  const statusFor = (index) => index < completedCount ? 'completed' : index === nextQuestIndex ? 'active' : 'locked'

  return (
    <StandardScreen step="quests" onBack={onBack} className="onboarding-quests">
      <Heading title={<>你的清净之路<br />从这里开始</>} subtitle="完成三步即可揭晓你的守护佛，之后可选择下一段体验。" />
      <div className="onboarding-progress"><i style={{ width: `${Math.min(completedCount, 3) * (100 / 3)}%` }} /></div>
      <p className="onboarding-progress-copy">已完成 {Math.min(completedCount, 3)} / 3 个必做步骤</p>
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
              <em>{status === 'completed' ? '已完成' : status === 'active' ? (index === 0 ? '进行中' : '可继续') : '待解锁'}</em>
            </button>
          )
        })}
      </div>
      <div className="onboarding-zen-tip">
        <img src="/app-onboarding/zen-tip-landscape.webp" alt="晨光山水" loading="lazy" decoding="async" />
        <span><b>今日禅意</b>心越安静，路越清晰。</span>
      </div>
      <PrimaryButton disabled={busy} aria-busy={busy} onClick={onContinue}>继续旅程</PrimaryButton>
    </StandardScreen>
  )
}

function WishOneScreen({ payload, setPayload, onBack, onContinue, busy = false }) {
  const canContinue = payload.improvement && payload.support
  return (
    <StandardScreen step="wish-one" onBack={onBack} className="onboarding-survey">
      <Heading icon={false} title={<>告诉我们<br />你内心所求</>} subtitle="你的回答会帮助我们理解你的愿望，以及你需要的引导方式。" />
      <section className="onboarding-question-card">
        <p>01 / 02</p><h2>你最想改善哪方面？</h2>
        <div className="onboarding-choice-grid">
          {IMPROVEMENTS.map(([id, label]) => <ChoiceButton key={id} selected={payload.improvement === id} onClick={() => setPayload({ improvement: id })}>{label}</ChoiceButton>)}
        </div>
      </section>
      <section className="onboarding-question-card onboarding-question-card--compact">
        <p>02 / 02</p><h2>你希望获得哪种支持？</h2>
        <div className="onboarding-chip-row">
          {SUPPORTS.map(([id, label]) => <ChoiceButton key={id} selected={payload.support === id} onClick={() => setPayload({ support: id })}>{label}</ChoiceButton>)}
        </div>
      </section>
      <p className="onboarding-helper">这一步关注你的愿望与发心。</p>
      <PrimaryButton disabled={!canContinue || busy} aria-busy={busy} onClick={onContinue}>继续</PrimaryButton>
    </StandardScreen>
  )
}

function BirthdateScreen({ payload, setPayload, onBack, onContinue, busy = false }) {
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

  return (
    <StandardScreen step="birthdate" onBack={onBack} className="onboarding-birthdate">
      <Heading className="onboarding-heading--birthdate" title={<>出生信息会加深<br />你的共鸣</>} subtitle="用于个性化仪式感和守护佛匹配，不用于专业预测。" />
      <section className="onboarding-form-card">
        <h2>你的出生日期</h2>
        <div className="onboarding-date-grid">
          <label>月份<select aria-label="月份" value={payload.month} onChange={(event) => updateDate({ month: event.target.value })}>{MONTHS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label>日期<select aria-label="日期" value={payload.day} onChange={(event) => setPayload({ day: event.target.value })}>{Array.from({ length: maxDays }, (_, index) => String(index + 1)).map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>年份<select aria-label="年份" value={payload.year} onChange={(event) => updateDate({ year: event.target.value })}>{Array.from({ length: 100 }, (_, index) => String(maxYear - index)).map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <label className="onboarding-toggle-row">
          <span>包含出生时间 <small>（选填）</small></span>
          <input type="checkbox" checked={payload.includeTime} onChange={(event) => setPayload({ includeTime: event.target.checked })} />
          <i aria-hidden="true" />
        </label>
        {payload.includeTime ? <label className="onboarding-time-label">出生时间<input aria-label="出生时间" type="time" value={payload.time} onChange={(event) => setPayload({ time: event.target.value })} /></label> : null}
      </section>
      <aside className="onboarding-note onboarding-note--gold">此信息仅用于个性化体验，不会公开。</aside>
      {!isOldEnough ? <p className="onboarding-error" role="alert">需要年满 13 岁才能继续</p> : null}
      <PrimaryButton disabled={!isOldEnough || busy} aria-busy={busy} onClick={onContinue}>继续</PrimaryButton>
    </StandardScreen>
  )
}

const WISH_TWO_GROUPS = [
  ['pace', '什么节奏更适合你？', PACE_OPTIONS],
  ['blessing', '你最希望获得哪种祝福？', BLESSING_OPTIONS],
  ['innerState', '你现在最明显的感受？', INNER_STATE_OPTIONS],
]

function WishTwoScreen({ payload, setPayload, onBack, onContinue, busy = false }) {
  const canContinue = payload.pace && payload.blessing && payload.innerState
  return (
    <StandardScreen step="wish-two" onBack={onBack} className="onboarding-survey onboarding-survey--two">
      <Heading icon={false} title={<>你希望如何<br />被陪伴？</>} subtitle="选择最贴近你当下感受的答案。" />
      <div className="onboarding-question-rows">
        {WISH_TWO_GROUPS.map(([key, title, options], index) => (
          <section key={key}>
            <h2><b>0{index + 1}</b>{title}</h2>
            <div className="onboarding-chip-row">
              {options.map(([id, label]) => <ChoiceButton key={id} selected={payload[key] === id} onClick={() => setPayload({ [key]: id })}>{label}</ChoiceButton>)}
            </div>
          </section>
        ))}
      </div>
      <div className="onboarding-selection-summary">♡ 将以你选择的陪伴、祝福与内在状态为你寻找守护</div>
      <PrimaryButton disabled={!canContinue || busy} aria-busy={busy} onClick={onContinue}>揭晓我的守护佛</PrimaryButton>
    </StandardScreen>
  )
}

function PresenceScreen({ onBack, onContinue, reducedMotion }) {
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
      <img className="onboarding-presence-art" src="/app-onboarding/presence-buddha.webp" alt="佛像在晨光与莲花之间显现" data-motion-beat="visual" />
      <div className="onboarding-presence-light" data-motion-beat="light" aria-hidden="true" />
      <FlowHeader step="presence" onBack={onBack} />
      <div className="onboarding-presence-copy">
        <p data-motion-beat="eyebrow">深度聆听</p>
        <h1 tabIndex="-1" data-onboarding-heading data-motion-beat="title">佛的临在</h1>
        <div className="onboarding-breathing-orb" data-motion-beat="orb"><LotusMark /></div>
        <blockquote data-motion-beat="quote">“静默，就是你正在寻找的答案。”</blockquote>
        <span data-motion-beat="status" aria-live="polite">保持一次完整呼吸，随后将自动继续。</span>
        <button className="onboarding-text-button" data-motion-beat="action" type="button" onClick={onContinue}>暂时跳过</button>
      </div>
    </section>
  )
}

function ResonanceScreen({ onBack, onContinue, reducedMotion }) {
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

  const rows = [['心愿与发心', '已读取'], ['出生共鸣', '已校准'], ['内在状态', '正在聆听']]
  return (
    <StandardScreen step="resonance" onBack={onBack} className="onboarding-resonance">
      <div className="onboarding-resonance-art"><img src="/app-onboarding/transition-vortex.webp" alt="观音菩萨与共鸣光环" /></div>
      <Heading icon={false} title={<>正在校准<br />你的内在共鸣</>} subtitle="正在将智慧转化为慈悲..." />
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
              <i /><span><b>{title}</b><small>{subtitle}</small></span><em>{state === 'complete' ? '完成' : state === 'working' ? '进行中' : '等待'}</em>
            </div>
          )
        })}
      </div>
      <p className="onboarding-auto-progress" aria-live="polite">校准完成后将自动继续</p>
    </StandardScreen>
  )
}

function BlessingScreen({ onBack, onContinue, reducedMotion }) {
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
      <img className="onboarding-blessing-art" src="/app-onboarding/blessing-lotus.webp" alt="金色莲花正在汇聚守护光芒" data-motion-beat="visual" />
      <div className="onboarding-blessing-beam" data-motion-beat="beam" aria-hidden="true" />
      <div className="onboarding-particles" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ '--i': index, '--particle-index': index }} />)}</div>
      <FlowHeader step="blessing" onBack={onBack} />
      <div className="onboarding-blessing-copy">
        <p data-motion-beat="eyebrow">神圣准备</p>
        <h1 tabIndex="-1" data-onboarding-heading data-motion-beat="title">正在准备<br />你的守护佛</h1>
        <div className="onboarding-loading-ring" data-motion-beat="ring" role="status" aria-label="正在生成守护佛" />
        <h2 data-motion-beat="status">正在接收祝福...</h2><span data-motion-beat="caption">正在综合最适合你内在的智慧</span>
        <div className="onboarding-loading-line" data-motion-beat="progress"><i /></div>
      </div>
    </section>
  )
}

const GUARDIANS = {
  emotional_peace: { id: 'amitabha', name: '阿弥陀佛', traits: '安定 · 慈悲 · 归心', reason: '与你渴望平静与温和陪伴的愿望最为共鸣', greeting: '我会陪你安住此刻，让纷乱慢慢沉静。' },
  relationships: { id: 'guanyin', name: '观音菩萨', traits: '慈悲 · 安住 · 倾听', reason: '与你在人际关系中寻求理解与慈悲的愿望最为共鸣', greeting: '我会温柔地倾听，陪你看见自己与他人的需要。' },
  career: { id: 'akasagarbha', name: '虚空藏菩萨', traits: '专注 · 志愿 · 成就', reason: '与你希望在事业中稳步前行的愿望最为共鸣', greeting: '我会陪你澄清方向，把愿望化成坚定的下一步。' },
  health: { id: 'medicine-buddha', name: '药师佛', traits: '疗愈 · 更新 · 坚韧', reason: '与你对身心恢复与安稳的愿望最为共鸣', greeting: '我会陪你照顾身心，在每一次呼吸里重新积蓄力量。' },
  wealth: { id: 'caishen', name: '财神', traits: '丰盛 · 稳定 · 机缘', reason: '与你希望建立稳定与丰盛生活的愿望最为共鸣', greeting: '我会陪你看清资源与机会，让每一步更踏实。' },
  protection: { id: 'ksitigarbha', name: '地藏菩萨', traits: '守护 · 勇气 · 坚忍', reason: '与你寻求守护和坚定力量的愿望最为共鸣', greeting: '我会陪你稳稳站立，以勇气走过眼前的路。' },
  wisdom: { id: 'manjushri', name: '文殊菩萨', traits: '智慧 · 清明 · 洞见', reason: '与你寻求清明与洞见的愿望最为共鸣', greeting: '我会陪你拨开困惑，辨认真正重要的事情。' },
}

const GUARDIAN_TYPES = new Set(Object.values(GUARDIANS).map(({ id }) => id))

function GuardianScreen({ guardian, onBack, onMeet, onPractice, busy = false }) {
  return (
    <StandardScreen step="guardian" onBack={onBack} className="onboarding-guardian">
      <div className="onboarding-guardian-art" data-motion-sequence="guardian-reveal">
        <div className="onboarding-guardian-portal" data-motion-beat="portal" aria-hidden="true" />
        <img src={`/app-onboarding/${guardian.id}-full.webp`} alt={guardian.name} decoding="async" data-motion-beat="visual" />
      </div>
      <div className="onboarding-guardian-copy" data-motion-sequence="guardian-copy">
        <span data-motion-beat="eyebrow">你的本命守护</span>
        <h1 tabIndex="-1" data-onboarding-heading data-motion-beat="title">守护佛已显现</h1>
        <h2 data-motion-beat="name">{guardian.name}</h2>
        <p data-motion-beat="traits">{guardian.traits}</p><small data-motion-beat="reason">{guardian.reason}</small>
        <PrimaryButton data-motion-beat="primary-action" disabled={busy} aria-busy={busy} onClick={onMeet}>遇见我的守护佛</PrimaryButton>
        <SecondaryButton data-motion-beat="secondary-action" disabled={busy} onClick={onPractice}>开始 30 秒练习</SecondaryButton>
      </div>
    </StandardScreen>
  )
}

function ConversationScreen({ guardian, payload, setPayload, onBack, onBegin, onPractice, busy = false }) {
  return (
    <StandardScreen step="conversation" onBack={onBack} className="onboarding-conversation">
      <div className="onboarding-guardian-profile">
        <img src={`/app-onboarding/${guardian.id}-full.webp`} alt={`${guardian.name}头像`} decoding="async" />
        <span><small>你的守护佛</small><h1 tabIndex="-1" data-onboarding-heading>{guardian.name}</h1><p>{guardian.traits}</p></span>
      </div>
      <blockquote>{guardian.greeting}<small>刚刚</small></blockquote>
      <h2>你想从哪里开始？</h2>
      <div className="onboarding-prompt-list">
        {PROMPTS.map(([id, label]) => <ChoiceButton key={id} selected={payload.prompt === id} onClick={() => setPayload({ prompt: id })}>{label}</ChoiceButton>)}
      </div>
      <PrimaryButton disabled={busy} aria-busy={busy} onClick={onBegin}>开始对话</PrimaryButton>
      <button className="onboarding-text-button" type="button" disabled={busy} onClick={onPractice}>开始 30 秒练习</button>
    </StandardScreen>
  )
}

function PracticeScreen({ onBack, onMeet, onComplete, busy = false }) {
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
    <StandardScreen step="practice" onBack={onBack} className="onboarding-practice">
      <Heading icon={false} title="30 秒安住练习" subtitle="让自己暂停片刻，完整地回到当下。" />
      <div className="onboarding-timer" style={{ '--progress': `${progress * 360}deg` }}>
        <span><b>00:{String(remaining).padStart(2, '0')}</b><small>{elapsed === 30 ? '练习完成' : running ? '安住呼吸' : '准备开始'}</small></span>
      </div>
      <section className="onboarding-checklist">
        <h2>开始前的三个准备</h2>
        {['找到舒适的坐姿', '缓慢地深呼吸三次', '允许念头自然经过'].map((item, index) => <p key={item} className={elapsed >= (index + 1) * 10 ? 'is-done' : ''}><i>{elapsed >= (index + 1) * 10 ? '✓' : ''}</i>{item}</p>)}
      </section>
      {elapsed >= 30 ? (
        <PrimaryButton disabled={busy} aria-busy={busy} onClick={onComplete}>完成</PrimaryButton>
      ) : (
        <PrimaryButton disabled={busy} onClick={() => setRunning((value) => !value)}>{running ? '暂停练习' : elapsed ? '继续练习' : '开始 30 秒练习'}</PrimaryButton>
      )}
      <button className="onboarding-text-button" type="button" disabled={busy} onClick={onMeet}>先去见我的守护佛</button>
    </StandardScreen>
  )
}

function CompleteScreen({ guest = false, onRestart, busy = false, embedded = false }) {
  return (
    <section className="onboarding-screen onboarding-screen--complete">
      <div className="onboarding-complete-halo"><LotusMark /></div>
      <Heading
        icon={false}
        title={guest ? '游客体验已开启' : '你已经开始了'}
        subtitle={guest ? '你可以先浏览首页；进入问答时，我们会继续邀请你完成个性化设置。' : '你的个性化设置已经保存在此设备，接下来可以继续你的清净之旅。'}
      />
      {!embedded && <PrimaryButton disabled={busy} aria-busy={busy} onClick={onRestart}>重新查看引导</PrimaryButton>}
      {!embedded && <a className="onboarding-home-link" href="/">返回官网首页</a>}
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
  const [completedQuests, setCompletedQuests] = useState(0)
  const [pendingAction, setPendingAction] = useState(false)
  const [bridgeError, setBridgeError] = useState('')
  const guardian = Object.values(GUARDIANS).find(({ id }) => id === payload.guardianType)
    ?? GUARDIANS[payload.improvement]
    ?? GUARDIANS.relationships
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
          locale: message.payload?.locale || 'zh-Hans',
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
    if (!BRIDGE_EVENTS.has(event)) return Promise.reject({ message: '不支持的 App 操作' })
    if (typeof window.ReactNativeWebView?.postMessage !== 'function') {
      return Promise.reject({ message: '无法连接到 App，请稍后重试' })
    }
    const id = createBridgeMessageId(++bridgeMessageNumber.current)
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        if (!bridgeRequests.current.delete(id)) return
        reject({ code: 'timeout', message: 'App 响应超时，请重试', retryable: true })
      }, event.startsWith('auth.') ? BRIDGE_AUTH_TIMEOUT_MS : BRIDGE_ACK_TIMEOUT_MS)
      bridgeRequests.current.set(id, { event, resolve, reject, timer })
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({ v: 1, type: 'event', event, id, payload: requestPayload }))
      } catch {
        window.clearTimeout(timer)
        bridgeRequests.current.delete(id)
        reject({ message: '无法连接到 App，请稍后重试' })
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
      if (mounted.current) setBridgeError(error?.message || '操作失败，请重试')
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
      if (!GUARDIAN_TYPES.has(guardianType)) throw { message: '未能获取守护佛，请重试' }
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
    window.history.replaceState({ onboardingStep: initialStep.current, onboardingDepth: 0 }, '')
  }, [])

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
    const nextDepth = historyDepth.current + 1
    historyDepth.current = nextDepth
    setDirection(nextDirection)
    setStep(next)
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
        window.history.replaceState({ onboardingStep: previous, onboardingDepth: historyDepth.current }, '')
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
      if (!GUARDIAN_TYPES.has(guardianType)) throw { message: '未能获取守护佛，请重试' }
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
      embedded={embedded}
      requestNative={requestNative}
      onBack={() => goBack('welcome')}
      onSuccess={async () => {
        if (embedded) await requestNative('onboarding.persist', { step: 'quests', data: {} })
        go('quests')
      }}
    />,
    quests: <QuestsScreen
      busy={pendingAction}
      completedCount={completedQuests}
      onBack={() => goBack('welcome')}
      onSelectQuest={selectQuest}
      onContinue={continueFromQuests}
    />,
    'wish-one': <WishOneScreen
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
      reducedMotion={reducedMotion}
      onBack={() => goBack('wish-two')}
      onContinue={() => runNativeAction('onboarding.persist', {
        step: 'presence_transition',
        data: toNativeResumePayload('presence_transition', payload),
      }, () => go('resonance'))}
    />,
    resonance: <ResonanceScreen
      reducedMotion={reducedMotion}
      onBack={() => goBack('presence')}
      onContinue={() => runNativeAction('onboarding.persist', {
        step: 'presence_blessing',
        data: toNativeResumePayload('presence_blessing', payload),
      }, () => go('blessing'))}
    />,
    blessing: <BlessingScreen reducedMotion={reducedMotion} onBack={() => goBack('resonance')} onContinue={revealGuardian} />,
    guardian: embedded && !GUARDIAN_TYPES.has(payload.guardianType) ? (
      <section className="onboarding-screen onboarding-bridge-loading" role="status">正在获取你的守护佛…</section>
    ) : <GuardianScreen
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
      busy={pendingAction}
      onBack={() => goBack('conversation')}
      onMeet={() => goBack('conversation')}
      onComplete={finishPractice}
    />,
    complete: <CompleteScreen embedded={embedded} busy={pendingAction} onRestart={restart} />,
    'guest-home': <CompleteScreen embedded={embedded} guest busy={pendingAction} onRestart={restart} />,
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
    <main className="app-onboarding" lang={nativeBootstrap.locale}>
      <span className="sr-only" aria-live="polite" aria-atomic="true">{STEP_ANNOUNCEMENT[step]}</span>
      <div ref={shellRef} key={step} className={`app-onboarding__shell is-${direction}`}>
        {embedded && !nativeBootstrap.ready
          ? <section className="onboarding-screen onboarding-bridge-loading" role="status">正在连接 App…</section>
          : screens[step] ?? screens.welcome}
      </div>
      {bridgeError ? (
        <aside className="onboarding-bridge-error" role="alert">
          <span>{bridgeError}</span>
          {retryAction.current ? <button type="button" disabled={pendingAction} onClick={() => retryAction.current?.()}>重试</button> : null}
        </aside>
      ) : null}
    </main>
  )
}
