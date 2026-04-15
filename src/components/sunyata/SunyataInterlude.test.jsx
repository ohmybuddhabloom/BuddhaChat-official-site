import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SunyataInterlude from './SunyataInterlude.jsx'
import { createSceneSnapshot } from '../../content/sunyata.js'
import { submitChatPrompt } from '../../lib/siteApi.js'

vi.mock('../../lib/siteApi.js', () => ({
  submitChatPrompt: vi.fn(() => Promise.resolve({ ok: true })),
}))

describe('SunyataInterlude', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('applies independent copy, chat bar, and reply card offsets', async () => {
    const scene = createSceneSnapshot()
    scene.interlude.textX = 44
    scene.interlude.textY = -18
    scene.interlude.chatX = -26
    scene.interlude.chatY = 36
    scene.interlude.replyX = 28
    scene.interlude.replyY = -24
    scene.interlude.responseDelayMs = 1

    render(
      <SunyataInterlude
        sectionRef={null}
        chatBarRef={null}
        interlude={scene.interlude}
      />,
    )

    expect(screen.getByTestId('interlude-copy')).toHaveStyle({
      transform: 'translate3d(44px, -18px, 0px)',
    })

    expect(screen.getByTestId('interlude-chat-bar')).toHaveStyle({
      transform: 'translate3d(-26px, 36px, 0px)',
    })

    fireEvent.change(screen.getByLabelText('Ask Buddha a question'), {
      target: { value: 'How should I listen?' },
    })
    fireEvent.click(screen.getByRole('button', { name: scene.interlude.actionLabel }))

    await waitFor(() => {
      expect(screen.getByTestId('interlude-reply-card')).toHaveStyle({
        transform: 'translate3d(28px, -24px, 0px)',
      })
    })
  })

  it('keeps only one active conversation pair visible and replaces it with the newest prompt', async () => {
    vi.useFakeTimers()

    const scene = createSceneSnapshot()
    scene.interlude.responseLabel = 'Buddha replies'
    scene.interlude.responseText =
      'Your question has already begun to answer itself in the silence.'
    scene.interlude.responseDelayMs = 1
    scene.interlude.fadeDurationMs = 1

    render(
      <SunyataInterlude
        sectionRef={null}
        chatBarRef={null}
        interlude={scene.interlude}
      />,
    )

    fireEvent.change(screen.getByLabelText('Ask Buddha a question'), {
      target: { value: 'How do I move through uncertainty?' },
    })
    fireEvent.click(screen.getByRole('button', { name: scene.interlude.actionLabel }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(40)
    })

    expect(screen.getByTestId('interlude-user-card')).toHaveTextContent(
      'How do I move through uncertainty?',
    )
    expect(screen.getByTestId('interlude-reply-card')).toHaveTextContent(
      scene.interlude.responseText,
    )

    fireEvent.change(screen.getByLabelText('Ask Buddha a question'), {
      target: { value: 'What should I release today?' },
    })
    fireEvent.click(screen.getByRole('button', { name: scene.interlude.actionLabel }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(80)
    })

    expect(screen.getByTestId('interlude-user-card')).toHaveTextContent(
      'What should I release today?',
    )
    expect(screen.queryByText('How do I move through uncertainty?')).not.toBeInTheDocument()
    expect(screen.getAllByTestId(/interlude-(user|reply)-card/)).toHaveLength(2)
  })

  it('records the submitted prompt without blocking the animated exchange', async () => {
    const scene = createSceneSnapshot()

    render(
      <SunyataInterlude
        sectionRef={null}
        chatBarRef={null}
        interlude={scene.interlude}
      />,
    )

    fireEvent.change(screen.getByLabelText('Ask Buddha a question'), {
      target: { value: 'What should I carry forward?' },
    })
    fireEvent.click(screen.getByRole('button', { name: scene.interlude.actionLabel }))

    await waitFor(() => {
      expect(submitChatPrompt).toHaveBeenCalledWith({
        message: 'What should I carry forward?',
      })
    })
    expect(screen.getByTestId('interlude-user-card')).toHaveTextContent(
      'What should I carry forward?',
    )
  })
})
