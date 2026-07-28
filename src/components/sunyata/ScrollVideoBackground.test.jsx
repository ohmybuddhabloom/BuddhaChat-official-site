import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ScrollVideoBackground from './ScrollVideoBackground.jsx'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ScrollVideoBackground', () => {
  it('defers the video request until the visitor scrolls', async () => {
    const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
    const elementRef = { current: document.createElement('section') }

    render(
      <ScrollVideoBackground
        heroSectionRef={elementRef}
        endSectionRef={elementRef}
        stopTargetRef={elementRef}
        rangeKey="test"
        buddha={{ x: 0, y: 0, scale: 100 }}
      />,
    )

    expect(screen.getByTestId('scroll-video')).toHaveAttribute('preload', 'none')
    expect(load).not.toHaveBeenCalled()
    fireEvent.scroll(window)
    await waitFor(() => expect(load).toHaveBeenCalledOnce())
  })
})
