import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ScrollVideoBackground from './ScrollVideoBackground.jsx'
import { SCROLL_FRAME_COUNT } from '../../lib/scrollFrames.js'

const requested = []

class FakeImage {
  constructor() {
    this.onload = null
    this.onerror = null
    requested.push(this)
  }

  set src(value) {
    this._src = value
  }

  get src() {
    return this._src
  }

  decode() {
    return Promise.resolve()
  }
}

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

beforeEach(() => {
  requested.length = 0
  vi.stubGlobal('Image', FakeImage)
  window.requestIdleCallback = undefined
  mockReducedMotion(false)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('ScrollVideoBackground', () => {
  it('shows the poster first and never ships a video element', () => {
    renderBackground()
    expect(screen.getByTestId('scroll-poster')).toHaveAttribute('src', '/kling-buddha-scroll-poster.jpg')
    expect(screen.getByTestId('hero-scroll-figure')).toHaveAttribute('data-render-mode', 'image-sequence')
    expect(document.querySelector('video')).toBeNull()
  })

  it('starts loading sparse frames as soon as the visitor scrolls', () => {
    renderBackground()
    fireEvent.scroll(window)
    expect(requested.length).toBeGreaterThan(0)
    expect(requested.length).toBeLessThanOrEqual(4)
    // jsdom 视口 1024 宽，选桌面素材；第一帧最先请求
    expect(requested[0].src).toBe('/kling-buddha-scroll-frames/v1/d/000.webp')
    expect(requested[1].src).toBe('/kling-buddha-scroll-frames/v1/d/016.webp')
  })

  it('starts loading after page load even without a scroll', () => {
    vi.useFakeTimers()
    renderBackground()
    expect(requested).toHaveLength(0)
    act(() => {
      vi.advanceTimersByTime(700)
    })
    expect(requested.length).toBeGreaterThan(0)
  })

  it('draws the first loaded frame on the canvas and marks the figure ready', async () => {
    const drawImage = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage })
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      setTimeout(() => callback(performance.now()), 0)
      return 1
    })

    renderBackground()
    fireEvent.scroll(window)
    await act(async () => {
      requested[0].onload()
      await Promise.resolve()
      await new Promise((resolve) => setTimeout(resolve, 5))
    })

    expect(screen.getByTestId('hero-scroll-figure')).toHaveClass('is-ready')
    expect(drawImage).toHaveBeenCalledWith(requested[0], 0, 0, 1024, 682)
    expect(raf).toHaveBeenCalled()
  })

  it('keeps loading until every frame is requested', async () => {
    renderBackground()
    fireEvent.scroll(window)
    for (let guard = 0; guard < SCROLL_FRAME_COUNT * 2; guard += 1) {
      const pending = requested.filter((image) => !image.settled)
      if (!pending.length) break
      await act(async () => {
        for (const image of pending) {
          image.settled = true
          image.onload()
        }
        await Promise.resolve()
        await Promise.resolve()
      })
    }
    expect(new Set(requested.map((image) => image.src)).size).toBe(SCROLL_FRAME_COUNT)
  })

  it('downloads no frames for visitors who prefer reduced motion', () => {
    vi.useFakeTimers()
    mockReducedMotion(true)
    renderBackground()
    fireEvent.scroll(window)
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(requested).toHaveLength(0)
    expect(screen.getByTestId('scroll-poster')).toBeInTheDocument()
  })
})
