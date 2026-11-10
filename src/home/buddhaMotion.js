import { HERO_FRAME_COUNT } from '../lib/heroMotion.js'

// 佛像两段视频与吸附进度的纯计算（组件见 HomeBuddha.jsx）。
export const SPLIT_FRAME = 48
const VIDEO_BASE = '/kling-buddha-scroll-video/v2'

export function pickVideoSet(viewportWidth) {
  return viewportWidth > 900 ? 'd' : 'm'
}

export function getSegmentUrl(set, part) {
  return `${VIDEO_BASE}/${set}-${part}.mp4`
}

// 全局第 frame 帧在哪一段、段内第几帧；b 段没准备好时退回 a 段最后一帧。
export function locateFrame(frame, bReady) {
  const f = Math.min(HERO_FRAME_COUNT - 1, Math.max(0, Math.round(frame)))
  if (f < SPLIT_FRAME) return { part: 'a', local: f }
  if (!bReady) return { part: 'a', local: SPLIT_FRAME - 1 }
  return { part: 'b', local: f - SPLIT_FRAME }
}

// 滚动进度：轨道顶部在页面顶部（首屏），佛像吸住的距离 = 轨道高 - 佛像高 - 吸附位置。
export function getStickProgress(scrollY, { trackTop, trackHeight, figureHeight, stickTop }) {
  const distance = trackHeight - figureHeight - stickTop
  if (!(distance > 0)) return 0
  return Math.min(1, Math.max(0, (scrollY - trackTop + stickTop) / distance))
}

