import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ScrollVideoBackground from './ScrollVideoBackground.jsx'

function renderBackground() {
  const elementRef = { current: document.createElement('section') }
  return render(
    <ScrollVideoBackground
      heroSectionRef={elementRef}
      endSectionRef={elementRef}
      stopTargetRef={elementRef}
      rangeKey="test"
      buddha={{ x: 0, y: 0, scale: 100 }}
    />,
  )
}

function mockReducedMotion(matches) {
  window.matchMedia = vi.fn().mockReturnValue({ matches, addEventListener() {}, removeEventListener() {} })
}

let fetchMock

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) })
  vi.stubGlobal('fetch', fetchMock)
  URL.createObjectURL = vi.fn(() => 'blob:hero')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true })
  mockReducedMotion(false)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('ScrollVideoBackground', () => {
  it('先显示封面；视频元素存在但不预加载', () => {
    renderBackground()
    expect(screen.getByTestId('scroll-poster')).toHaveAttribute('src', '/kling-buddha-scroll-poster.jpg')
    expect(screen.getByTestId('hero-scroll-figure')).toHaveAttribute('data-render-mode', 'baked-video')
    const video = screen.getByTestId('scroll-video')
    expect(video).toHaveAttribute('preload', 'none')
    expect(video.muted).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('访客一滚动就以低优先级下载整段视频', async () => {
    renderBackground()
    fireEvent.scroll(window)
    await act(async () => {
      await Promise.resolve()
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    // jsdom 视口 1024 宽，选桌面版
    expect(fetchMock.mock.calls[0][0]).toBe('/kling-buddha-scroll-video/v1/d.mp4')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ priority: 'low' })
  })

  it('不滚动时，等首屏资源下完、网络空下来才下载', () => {
    vi.useFakeTimers()
    // jsdom 不真正加载图片；这里当作封面已经加载完
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true)
    vi.stubGlobal('PerformanceObserver', undefined)
    renderBackground()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(fetchMock).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('视频下完后挂到视频元素上，第一次定位完成才显示', async () => {
    renderBackground()
    fireEvent.scroll(window)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    const video = screen.getByTestId('scroll-video')
    expect(video.getAttribute('src')).toBe('blob:hero')
    expect(screen.getByTestId('hero-scroll-figure')).not.toHaveClass('is-ready')
    await act(async () => {
      video.dispatchEvent(new Event('loadedmetadata'))
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    // 苹果 Safari 要先播放一下才会解码画面
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
    await act(async () => {
      video.dispatchEvent(new Event('seeked'))
    })
    expect(screen.getByTestId('hero-scroll-figure')).toHaveClass('is-ready')
  })

  it('不允许自动播放时（如低电量模式），等第一次触摸再开始跟随滚动', async () => {
    HTMLMediaElement.prototype.play.mockRejectedValueOnce(new Error('NotAllowedError'))
    renderBackground()
    fireEvent.scroll(window)
    await act(async () => {
      for (let i = 0; i < 4; i += 1) await Promise.resolve()
    })
    const video = screen.getByTestId('scroll-video')
    await act(async () => {
      video.dispatchEvent(new Event('loadedmetadata'))
      for (let i = 0; i < 4; i += 1) await Promise.resolve()
    })
    expect(HTMLMediaElement.prototype.pause).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.pointerDown(window)
      for (let i = 0; i < 4; i += 1) await Promise.resolve()
    })
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2)
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1)
  })

  it('下载失败时一直显示封面', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 })
    renderBackground()
    fireEvent.scroll(window)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(screen.getByTestId('scroll-video').getAttribute('src')).toBeNull()
    expect(screen.getByTestId('scroll-poster')).toBeInTheDocument()
  })

  it('偏好减少动态效果的访客不下载视频', () => {
    vi.useFakeTimers()
    mockReducedMotion(true)
    renderBackground()
    fireEvent.scroll(window)
    act(() => {
      vi.advanceTimersByTime(8000)
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByTestId('scroll-poster')).toBeInTheDocument()
  })
})
