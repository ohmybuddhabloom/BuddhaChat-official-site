import { useState } from 'react'

function SunyataInterlude({ sectionRef, chatBarRef, interlude }) {
  const [message, setMessage] = useState('')

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

      <form
        ref={chatBarRef}
        className="interlude-chat-bar"
        data-testid="interlude-chat-bar"
        data-layer="top"
        style={{
          transform: `translate3d(${interlude.chatX ?? 0}px, ${interlude.chatY ?? 0}px, 0px)`,
        }}
        onSubmit={(event) => event.preventDefault()}
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
        <button type="submit" className="interlude-submit">
          {interlude.actionLabel}
        </button>
      </form>
    </section>
  )
}

export default SunyataInterlude
