import { useEffect, useRef, useState } from 'react'

import { submitChatPrompt } from '../../lib/siteApi.js'

function SunyataInterlude({ sectionRef, chatBarRef, interlude }) {
  const [message, setMessage] = useState('')
  const [activeExchange, setActiveExchange] = useState(null)
  const [submitError, setSubmitError] = useState('')
  const timersRef = useRef([])

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId))
      timersRef.current = []
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
    void submitChatPrompt({ message: prompt }).catch((error) => {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'The message could not be recorded just now.',
      )
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
        style={{
          transform: `translate3d(${interlude.textX ?? 0}px, ${interlude.textY ?? 0}px, 0px)`,
        }}
      >
        <p className="interlude-kicker">{interlude.kicker}</p>
        <h2 className="interlude-title">{interlude.title}</h2>
        <p className="interlude-note">{interlude.note}</p>
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
            style={{
              transform: `translate3d(${interlude.replyX ?? 0}px, ${interlude.replyY ?? 0}px, 0px)`,
            }}
          >
            <span className="interlude-bubble-label">
              {interlude.responseLabel}
            </span>
            <p>{interlude.responseText}</p>
          </article>
        </div>
      ) : null}

      <form
        ref={chatBarRef}
        className="interlude-chat-bar"
        data-testid="interlude-chat-bar"
        data-layer="top"
        style={{
          transform: `translate3d(${interlude.chatX ?? 0}px, ${interlude.chatY ?? 0}px, 0px)`,
        }}
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
      {submitError ? (
        <p className="interlude-status" role="status" aria-live="polite">
          {submitError}
        </p>
      ) : null}
    </section>
  )
}

export default SunyataInterlude
