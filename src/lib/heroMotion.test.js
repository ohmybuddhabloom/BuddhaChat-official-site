import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  HERO_FRAME_COUNT,
  HERO_TIMELINE,
  createLatestSeeker,
  frameToTime,
  waitForQuietNetwork,
} from './heroMotion.js'
import { createFrameAnimator, smoothDamp } from './frameAnimator.js'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('时间轴（oil-motion 编译生成）', () => {
  it('145 帧、24 帧每秒，只来自编译产物', () => {
    expect(HERO_FRAME_COUNT).toBe(145)
    expect(HERO_TIMELINE.fps).toBe(24)
  })

  it('定位到帧中间，首尾不越界', () => {
    expect(frameToTime(0)).toBeCloseTo(0.5 / 24)
    expect(frameToTime(144)).toBeCloseTo(144.5 / 24)
    expect(frameToTime(999)).toBeCloseTo(144.5 / 24)
    expect(frameToTime(-3)).toBeCloseTo(0.5 / 24)
  })

})

describe('只提交最新目标帧', () => {
  function fakeVideo() {
    const video = new EventTarget()
    video.dataset = {}
    video.seeks = []
    let current = 0
    Object.defineProperty(video, 'currentTime', {
      get: () => current,
      set(value) {
        current = value
        video.seeks.push(value)
      },
    })
    return video
  }

  it('定位进行中来的目标只保留最新一个', () => {
    const video = fakeVideo()
    const shown = []
    const seeker = createLatestSeeker(video, { onShown: (frame) => shown.push(frame) })
    seeker.show(10)
    seeker.show(20)
    seeker.show(30)
    seeker.show(40)
    expect(video.seeks).toHaveLength(1)
    video.dispatchEvent(new Event('seeked'))
    expect(video.seeks).toHaveLength(2)
    expect(video.seeks[1]).toBeCloseTo(frameToTime(40))
    video.dispatchEvent(new Event('seeked'))
    expect(shown).toEqual([10, 40])
  })

  it('Safari 不发 seeked 时，300 毫秒后放行最新目标，不会卡住', () => {
    vi.useFakeTimers()
    const video = fakeVideo()
    const seeker = createLatestSeeker(video)
    seeker.show(10)
    seeker.show(50)
    vi.advanceTimersByTime(350)
    expect(video.seeks.at(-1)).toBeCloseTo(frameToTime(50))
    vi.advanceTimersByTime(350)
    expect(seeker.getShown()).toBe(50)
  })

  it('目标时间和当前时间相同（Safari 不发 seeked）时直接算完成', () => {
    const video = fakeVideo()
    video.currentTime = frameToTime(7)
    video.seeks.length = 0
    const seeker = createLatestSeeker(video)
    seeker.show(7)
    expect(video.seeks).toHaveLength(0)
    expect(seeker.getShown()).toBe(7)
    seeker.show(8)
    expect(video.seeks).toHaveLength(1)
  })

  it('目标就是当前帧时不重复定位', () => {
    const video = fakeVideo()
    const seeker = createLatestSeeker(video)
    seeker.show(5)
    video.dispatchEvent(new Event('seeked'))
    seeker.show(5)
    expect(video.seeks).toHaveLength(1)
  })
})

describe('逐帧随动', () => {
  it('平滑靠近目标且不越过', () => {
    let [position, velocity] = [0, 0]
    for (let i = 0; i < 200; i += 1) {
      ;[position, velocity] = smoothDamp(position, 100, velocity, 0.11, 290, 1 / 60)
      expect(position).toBeLessThanOrEqual(100)
    }
    expect(position).toBeCloseTo(100, 1)
  })

  it('滚到底停在最后一帧，停手后停止动画循环', () => {
    const frames = []
    const queue = []
    let now = 0
    const animator = createFrameAnimator({
      frameCount: 145,
      render: (frame) => frames.push(frame),
      requestFrame: (callback) => queue.push(callback),
      cancelFrame: () => {},
    })
    animator.setProgress(1)
    while (queue.length) {
      now += 16
      queue.shift()(now)
    }
    expect(frames[0]).toBe(0)
    expect(frames.at(-1)).toBe(144)
    expect(queue).toHaveLength(0)
  })
})

describe('等网络空下来再下载', () => {
  it('页面加载后一段时间没有新资源才开始', () => {
    vi.useFakeTimers()
    vi.stubGlobal('PerformanceObserver', undefined)
    Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true })
    const start = vi.fn()
    waitForQuietNetwork(start, { quietMs: 1200, maxWaitMs: 6000, pendingImages: () => 0 })
    vi.advanceTimersByTime(1100)
    expect(start).not.toHaveBeenCalled()
    vi.advanceTimersByTime(200)
    expect(start).toHaveBeenCalledTimes(1)
  })

  it('还有图片没加载完就继续等', () => {
    vi.useFakeTimers()
    vi.stubGlobal('PerformanceObserver', undefined)
    Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true })
    let pending = 2
    const start = vi.fn()
    waitForQuietNetwork(start, { quietMs: 1200, maxWaitMs: 10000, pendingImages: () => pending })
    vi.advanceTimersByTime(3000)
    expect(start).not.toHaveBeenCalled()
    pending = 0
    vi.advanceTimersByTime(1300)
    expect(start).toHaveBeenCalledTimes(1)
  })

  it('一直有资源在下载时，最多再等 6 秒', () => {
    vi.useFakeTimers()
    let notify = () => {}
    vi.stubGlobal('PerformanceObserver', class {
      constructor(callback) {
        notify = callback
      }
      observe() {}
      disconnect() {}
    })
    Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true })
    const start = vi.fn()
    waitForQuietNetwork(start, { quietMs: 1200, maxWaitMs: 6000, pendingImages: () => 0 })
    for (let t = 0; t < 5500; t += 500) {
      vi.advanceTimersByTime(500)
      notify()
    }
    expect(start).not.toHaveBeenCalled()
    vi.advanceTimersByTime(600)
    expect(start).toHaveBeenCalledTimes(1)
  })
})
