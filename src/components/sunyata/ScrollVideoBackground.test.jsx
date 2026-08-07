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

  it('starts muted playback once the video hydrates so scrub frames render on iOS', async () => {
    const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
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

    fireEvent.scroll(window)
    await waitFor(() => expect(load).toHaveBeenCalledOnce())

    const video = screen.getByTestId('scroll-video')
    Object.defineProperty(video, 'videoWidth', { value: 1024 })
    Object.defineProperty(video, 'videoHeight', { value: 682 })
    Object.defineProperty(video, 'duration', { value: 6 })
    video.dispatchEvent(new Event('loadedmetadata'))

    await waitFor(() => expect(play).toHaveBeenCalledOnce())
  })
})
