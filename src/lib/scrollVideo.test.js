import { describe, expect, it } from 'vitest'
import {
  getDockAboveScroll,
  getFrameSelection,
  getScrollFollowOffset,
  getScrollStopAtViewportPosition,
  getScrollVideoRange,
  getScrollVideoProgress,
  getScrollVideoTime,
} from './scrollVideo.js'

describe('scroll video mapping', () => {
  it('creates a scroll range from the hero start to the interlude end', () => {
    expect(getScrollVideoRange(120, 980, 640)).toEqual({
      startScroll: 120,
      endScroll: 1620,
    })
  })

  it('finds the scroll point where the input center reaches a viewport anchor', () => {
    expect(getScrollStopAtViewportPosition(1800, 96, 1000)).toBe(1348)
    expect(getScrollStopAtViewportPosition(1800, 96, 1000, 0.7)).toBe(1148)
  })

  it('maps hero-to-interlude boundaries to normalized progress', () => {
    expect(getScrollVideoProgress(0, 0, 2800)).toBe(0)
    expect(getScrollVideoProgress(1400, 0, 2800)).toBe(0.5)
    expect(getScrollVideoProgress(2800, 0, 2800)).toBe(1)
    expect(getScrollVideoProgress(3200, 0, 2800)).toBe(1)
  })

  it('clamps values before the start and after the end', () => {
    expect(getScrollVideoProgress(-400, 200, 1200)).toBe(0)
    expect(getScrollVideoProgress(1600, 200, 1200)).toBe(1)
  })

  it('returns a safe fallback when the measured range is invalid', () => {
    expect(getScrollVideoProgress(500, 800, 800)).toBe(0)
    expect(getScrollVideoTime(500, 800, 800, 12)).toBe(0)
    expect(getScrollVideoRange(Number.NaN, 500, 400)).toEqual({
      startScroll: 0,
      endScroll: 0,
    })
  })

  it('converts section-based progress into video time', () => {
    expect(getScrollVideoTime(1000, 0, 2000, 5)).toBe(2.5)
    expect(getScrollVideoTime(2400, 0, 2000, 5)).toBe(5)
  })

  it('turns section scroll into a clamped page-follow distance', () => {
    expect(getScrollFollowOffset(0, 0, 2200)).toBe(0)
    expect(getScrollFollowOffset(900, 0, 2200)).toBe(900)
    expect(getScrollFollowOffset(3000, 0, 2200)).toBe(2200)
  })

  it('selects neighboring frames and blend amount for smooth interpolation', () => {
    expect(getFrameSelection(0, 12)).toEqual({
      currentIndex: 0,
      nextIndex: 1,
      blend: 0,
    })
    expect(getFrameSelection(0.5, 12)).toEqual({
      currentIndex: 5,
      nextIndex: 6,
      blend: 0.5,
    })
    expect(getFrameSelection(1, 12)).toEqual({
      currentIndex: 11,
      nextIndex: 11,
      blend: 0,
    })
  })
})

describe('getDockAboveScroll', () => {
  it('佛像底边停在标题上方 gap 处（佛像每滚 1px 在页面上移动 scale px）', () => {
    // 起点中心 500，高 200，莲座底在中心下 76；标题顶 1000，留 20 → 底边要到 980，需移动 404，scale 1.25 → 滚 323.2
    expect(
      getDockAboveScroll({ startScroll: 0, figureCenterAtStart: 500, figureHeight: 200, scale: 1.25, copyTop: 1000 }),
    ).toBeCloseTo(323.2)
  })

  it('标题已经在佛像上方够远时不往回算，数值无效时退回起点', () => {
    expect(getDockAboveScroll({ startScroll: 10, figureCenterAtStart: 900, figureHeight: 200, scale: 1, copyTop: 500 })).toBe(10)
    expect(getDockAboveScroll({ startScroll: 10, figureCenterAtStart: NaN, figureHeight: 200, scale: 1, copyTop: 500 })).toBe(10)
  })
})
