import { useEffect, useState } from 'react'
import { buildAuthReturnUrl, fetchZentubeSession, verifyAccountCode, requestAccountCode } from '../lib/fusionAuth.js'
import './AccountLoginPage.css'

const COPY = {
  zh: { title: '登录 BuddhaChat', subtitle: '使用同一个账号阅读、聆听与交流。', email: '邮箱', code: '验证码', send: '发送验证码', sending: '正在发送…', verify: '登录 / 注册', verifying: '正在验证…', sent: '验证码已发送，请检查邮箱。', failed: '操作未完成，请稍后重试。', change: '更换邮箱', home: '返回首页', google: '使用 Google 登录', apple: '使用 Apple 登录', notice: '首次验证邮箱后会创建账号。', terms: '服务条款', privacy: '隐私政策' },
  en: { title: 'Sign in to BuddhaChat', subtitle: 'One account to read, listen, and connect.', email: 'Email', code: 'Verification code', send: 'Send code', sending: 'Sending…', verify: 'Sign in / Register', verifying: 'Verifying…', sent: 'Code sent. Please check your inbox.', failed: 'Unable to complete the request. Please try again.', change: 'Change email', home: 'Back to home', google: 'Continue with Google', apple: 'Continue with Apple', notice: 'Your first email verification creates your account.', terms: 'Terms', privacy: 'Privacy' },
}

export default function AccountLoginPage() {
  const params = new URLSearchParams(window.location.search)
  const locale = (params.get('lang') || navigator.language || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en'
  const copy = COPY[locale]
  const returnUrl = buildAuthReturnUrl(params.get('returnUrl') || '/', window.location.origin)
  const safeDestination = /\/(?:auth\/)?login\/?$/.test(new URL(returnUrl).pathname) ? '/' : returnUrl
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('email')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    fetchZentubeSession().then((session) => {
      if (active && session.authenticated) window.location.replace(safeDestination)
    })
    return () => { active = false }
  }, [safeDestination])

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      if (step === 'email') {
        await requestAccountCode(email.trim())
        setStep('code')
        setMessage(copy.sent)
      } else {
        await verifyAccountCode({ email: email.trim(), token: code.trim() })
        window.location.replace(safeDestination)
      }
    } catch {
      setMessage(copy.failed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="account-page" data-testid="account-login">
      <section className="account-card" aria-labelledby="account-title">
        <a href="/" className="account-home">BuddhaChat</a>
        <h1 id="account-title">{copy.title}</h1>
        <p>{copy.subtitle}</p>
        <form onSubmit={submit}>
          <label htmlFor="account-email">{copy.email}</label>
          <input id="account-email" data-testid="account-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} readOnly={step === 'code'} disabled={busy} />
          {step === 'code' ? <>
            <label htmlFor="account-code">{copy.code}</label>
            <input id="account-code" data-testid="account-code" type="text" inputMode="numeric" autoComplete="one-time-code" required maxLength={12} value={code} onChange={(event) => setCode(event.target.value)} disabled={busy} />
            <button type="button" className="account-link" disabled={busy} onClick={() => { setStep('email'); setCode(''); setMessage('') }}>{copy.change}</button>
          </> : null}
          <button type="submit" data-testid="account-submit" disabled={busy}>{step === 'email' ? (busy ? copy.sending : copy.send) : (busy ? copy.verifying : copy.verify)}</button>
          <p role="status" aria-live="polite">{message}</p>
        </form>
        <p className="account-notice">{copy.notice}</p>
        <div className="account-providers">
          <a href={`/videos/auth/google?returnUrl=${encodeURIComponent(safeDestination)}`}>{copy.google}</a>
          <a href={`/videos/auth/apple?returnUrl=${encodeURIComponent(safeDestination)}`}>{copy.apple}</a>
        </div>
        <footer><a href="/">{copy.home}</a><a href="https://legal.buddhachat.online/terms">{copy.terms}</a><a href="https://legal.buddhachat.online/privacy">{copy.privacy}</a></footer>
      </section>
    </main>
  )
}
