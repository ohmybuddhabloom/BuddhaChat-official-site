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

  it('plays only while scrubbing and pauses once the target frame is reached', async () => {
    const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
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

    // 滚动驱动渲染时短暂进入播放态
    await waitFor(() => expect(play).toHaveBeenCalledOnce())
    // 目标帧就绪后立即暂停，恢复「跟随滚轮、静止不播」的 scrub 语义
    await waitFor(() => expect(pause).toHaveBeenCalledOnce())
  })
})
