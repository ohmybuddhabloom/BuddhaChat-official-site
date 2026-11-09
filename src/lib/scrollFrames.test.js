import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  SCROLL_FRAME_BASE,
  SCROLL_FRAME_COUNT,
  buildScrollFrameLoadOrder,
  findNearestLoadedFrame,
  getScrollFrameUrl,
  limitScrollFrameLoadOrder,
  pickScrollFrameSet,
  shouldLimitScrollFrames,
} from './scrollFrames.js'

describe('scrollFrames', () => {
  it('loads sparse frames first and every frame exactly once', () => {
    const order = buildScrollFrameLoadOrder(SCROLL_FRAME_COUNT)
    expect(order.slice(0, 4)).toEqual([0, 16, 32, 48])
    expect(order.indexOf(SCROLL_FRAME_COUNT - 1)).toBeLessThan(12)
    expect(new Set(order).size).toBe(SCROLL_FRAME_COUNT)
    expect(order).toHaveLength(SCROLL_FRAME_COUNT)
  })

  it('limits data-saver visitors to every fourth frame plus the last', () => {
    const limited = limitScrollFrameLoadOrder(buildScrollFrameLoadOrder(SCROLL_FRAME_COUNT))
    expect(limited.every((index) => index % 4 === 0 || index === SCROLL_FRAME_COUNT - 1)).toBe(true)
    expect(limited).toContain(SCROLL_FRAME_COUNT - 1)
    expect(limited.length).toBe(37)
    expect(shouldLimitScrollFrames({ saveData: true })).toBe(true)
    expect(shouldLimitScrollFrames({ effectiveType: '2g' })).toBe(true)
    expect(shouldLimitScrollFrames({ effectiveType: '4g' })).toBe(false)
    expect(shouldLimitScrollFrames(undefined)).toBe(false)
  })

  it('falls back to the closest frame that has arrived', () => {
    const frames = new Array(10).fill(null)
    expect(findNearestLoadedFrame(frames, 5)).toBe(-1)
    frames[0] = {}
    frames[8] = {}
    expect(findNearestLoadedFrame(frames, 5.4)).toBe(8)
    expect(findNearestLoadedFrame(frames, 3)).toBe(0)
    expect(findNearestLoadedFrame(frames, 99)).toBe(8)
  })

  it('uses the lighter frame set on phones and tablets', () => {
    expect(pickScrollFrameSet(390)).toBe('m')
    expect(pickScrollFrameSet(900)).toBe('m')
    expect(pickScrollFrameSet(1440)).toBe('d')
    expect(getScrollFrameUrl('m', 7)).toBe(`${SCROLL_FRAME_BASE}/m/007.webp`)
  })

  it('ships every frame for both sets', () => {
    for (const set of ['m', 'd']) {
      const directory = join(process.cwd(), 'public', SCROLL_FRAME_BASE, set)
      expect(existsSync(directory)).toBe(true)
      const files = readdirSync(directory).filter((name) => name.endsWith('.webp'))
      expect(files).toHaveLength(SCROLL_FRAME_COUNT)
    }
  })
})
