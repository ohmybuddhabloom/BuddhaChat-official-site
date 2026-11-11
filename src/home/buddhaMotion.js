import { HERO_FRAME_COUNT } from '../lib/heroMotion.js'

// 佛像两段视频与吸附进度的纯计算（组件见 HomeBuddha.jsx）。
export const SPLIT_FRAME = 48
// v3（11-11）：直接从 4 月原版视频套调色做母版，手机和电脑共用 1024 宽、压缩率 20。
// v2 先经 WebP 帧图（质量 72）再压到 24/25，手机还缩到 768 宽，清晰度只剩原版的 45%～87%。
const VIDEO_BASE = '/kling-buddha-scroll-video/v3'

export function getSegmentUrl(part) {
  return `${VIDEO_BASE}/${part}.mp4`
}

// 全局第 frame 帧在哪一段、段内第几帧；b 段没准备好时退回 a 段最后一帧。
export function locateFrame(frame, bReady) {
  const f = Math.min(HERO_FRAME_COUNT - 1, Math.max(0, Math.round(frame)))
  if (f < SPLIT_FRAME) return { part: 'a', local: f }
  if (!bReady) return { part: 'a', local: SPLIT_FRAME - 1 }
  return { part: 'b', local: f - SPLIT_FRAME }
}

// 滚动进度：佛像在轨道里的初始位置就是它的吸附位置（margin-top = top），
// 所以从滚到轨道顶部起就吸住，滚过“轨道高 - 佛像高 - 吸附位置”后离开。
export function getStickProgress(scrollY, { trackTop, trackHeight, figureHeight, stickTop }) {
  const distance = trackHeight - figureHeight - stickTop
  if (!(distance > 0)) return 0
  return Math.min(1, Math.max(0, (scrollY - trackTop) / distance))
}

