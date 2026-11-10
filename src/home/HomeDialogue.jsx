import { trackCtaClick } from '../lib/analytics.js'
import { useEffect, useRef, useState } from 'react'

import { submitChatPrompt } from '../lib/siteApi.js'

// 问答段：标题、输入框、提交后的回复卡片（引导去 App）。位置全部由 home.css 决定。
function HomeDialogue({ interlude }) {
  const [message, setMessage] = useState('')
  const [activeExchange, setActiveExchange] = useState(null)
  const [_submitError, setSubmitError] = useState('')
  const timersRef = useRef([])
  const sectionRef = useRef(null)

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId))
      timersRef.current = []
    }
  }, [])

  // 手机底部“在 App 中打开”浮动按钮（public/open-in-app.js，四个站共用）会压住问答标题和输入框；
  // 问答段在屏幕上时给页面加标记，由 home.css 让按钮暂时淡出。
  useEffect(() => {
    const section = sectionRef.current
    if (!section || typeof IntersectionObserver !== 'function') return undefined
    const root = document.documentElement
    const observer = new IntersectionObserver(
      ([entry]) => root.classList.toggle('home-dialogue-in-view', entry.isIntersecting),
      { threshold: 0.15 },
    )
    observer.observe(section)
    return () => {
      observer.disconnect()
      root.classList.remove('home-dialogue-in-view')
    }
  }, [])

  const clearTimers = () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId))
    timersRef.current = []
  }

  const queueTimer = (callback, delay) => {
    const timerId = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((item) => item !== timerId)
      callback()
    }, delay)

    timersRef.current.push(timerId)
  }

  const mountExchange = (prompt) => {
    const exchangeId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const nextExchange = {
      id: exchangeId,
      prompt,
      responded: false,
      phase: 'entering',
    }

    setActiveExchange(nextExchange)

    queueTimer(() => {
      setActiveExchange((current) =>
        current?.id === exchangeId
          ? {
              ...current,
              phase: 'visible',
            }
          : current,
      )
    }, 30)

    queueTimer(() => {
      setActiveExchange((current) =>
        current?.id === exchangeId
          ? {
              ...current,
              responded: true,
            }
          : current,
      )
    }, interlude.responseDelayMs ?? 420)
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const prompt = message.trim()

    if (!prompt) {
      return
    }

    setMessage('')
    setSubmitError('')
    clearTimers()
    void submitChatPrompt({ message: prompt }).catch(() => {
      // Silently ignore recording errors — the visual experience is unaffected
    })

    if (activeExchange) {
      const outgoingId = activeExchange.id

      setActiveExchange((current) =>
        current
          ? {
              ...current,
              phase: 'exiting',
            }
          : current,
      )

      queueTimer(() => {
        setActiveExchange((current) =>
          current?.id === outgoingId ? null : current,
        )
        mountExchange(prompt)
      }, interlude.fadeDurationMs ?? 320)

      return
    }

    mountExchange(prompt)
  }

  return (
    <section
      ref={sectionRef}
      className="interlude-section"
      id="dialogue"
      data-stack="foreground"
      data-testid="conversation-interlude"
    >
      <div
        className="interlude-copy"
        data-testid="interlude-copy"
      >
        <p className="interlude-kicker">{interlude.kicker}</p>
        <h2 className="interlude-title">{interlude.title}</h2>
        {interlude.note ? <p className="interlude-note">{interlude.note}</p> : null}
      </div>

      {activeExchange ? (
        <div
          className={`interlude-overlay interlude-overlay--${activeExchange.phase}`}
          data-testid="interlude-overlay"
        >
          <article
            className={`interlude-floating-card interlude-floating-card--user interlude-floating-card--${activeExchange.phase}`}
            data-testid="interlude-user-card"
          >
            <span className="interlude-bubble-label">{interlude.actionLabel}</span>
            <p>{activeExchange.prompt}</p>
          </article>

          <article
            className={`interlude-floating-card interlude-floating-card--reply interlude-floating-card--${activeExchange.phase}${
              activeExchange.responded ? ' is-visible' : ''
            }`}
            data-testid="interlude-reply-card"
          >
            <span className="interlude-bubble-label">
              {interlude.responseLabel}
            </span>
            <p>{interlude.responseText}</p>
            {interlude.responseLinkLabel ? (
              <a
                className="interlude-reply-link"
                href={interlude.responseLinkHref || '/download'}
                onClick={() => trackCtaClick('interlude_download', 'official')}
              >
                {interlude.responseLinkLabel}
              </a>
            ) : null}
          </article>
        </div>
      ) : null}

      <form
        className="interlude-chat-bar"
        data-testid="interlude-chat-bar"
        data-layer="top"
        onSubmit={handleSubmit}
      >
        <label className="sr-only" htmlFor="buddha-question">
          Ask Buddha a question
        </label>
        <input
          id="buddha-question"
          className="interlude-input"
          type="text"
          value={message}
          placeholder={interlude.placeholder}
          onChange={(event) => setMessage(event.target.value)}
        />
        <button type="submit" className="interlude-submit" disabled={!message.trim()}>
          {interlude.actionLabel}
        </button>
      </form>
    </section>
  )
}

export default HomeDialogue
