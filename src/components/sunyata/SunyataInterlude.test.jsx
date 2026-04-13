import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SunyataInterlude from './SunyataInterlude.jsx'
import { createSceneSnapshot } from '../../content/sunyata.js'

describe('SunyataInterlude', () => {
  it('applies independent copy and chat bar offsets', () => {
    const scene = createSceneSnapshot()
    scene.interlude.textX = 44
    scene.interlude.textY = -18
    scene.interlude.chatX = -26
    scene.interlude.chatY = 36

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
  })
})
