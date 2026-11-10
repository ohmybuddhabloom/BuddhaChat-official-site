// 首页佛像：oil-motion 的 baked-video + frame-scrub 路线。
// 一个全关键帧 MP4（每一帧都能直接定位），滚动只决定显示第几帧。
import timeline from './heroMotion.timeline.json'

export const HERO_TIMELINE = timeline
export const HERO_FRAME_COUNT = timeline.frameCount
export const HERO_VIDEO_BASE = '/kling-buddha-scroll-video/v1'
export const HERO_VIDEO_SIZES = {
  m: { width: 768, height: 512 },
  d: { width: 1024, height: 682 },
}

// 只在初始化时选一次，普通 resize 不换源（oil-motion runtime 规则）。
export function pickHeroVideoSet(viewportWidth) {
  return viewportWidth > 900 ? 'd' : 'm'
}

export function getHeroVideoUrl(set) {
  return `${HERO_VIDEO_BASE}/${set}.mp4`
}

// 定位到帧的中间时刻，避免浮点误差落到前一帧。
export function frameToTime(frame, { fps, frameCount } = timeline) {
  const index = Math.min(frameCount - 1, Math.max(0, Math.round(frame)))
  return (index + 0.5) / fps
}

// 只提交最新目标帧：正在定位时来的新目标先记下，定位完成后只跳到最新那一帧，旧目标直接丢弃。
// Safari 两个坑：目标时间和当前时间相同时不发 seeked；偶尔丢 seeked。都会让“正在定位”卡住，后面的帧全被压着。
// 所以时间相同直接算完成，并且超过 SEEK_WATCHDOG_MS 没等到 seeked 也放行。
const SEEK_WATCHDOG_MS = 300

export function createLatestSeeker(video, { onShown, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  let seeking = false
  let pending = -1
  let shown = -1
  let target = -1
  let watchdog = 0

  const settle = () => {
    clearTimer(watchdog)
    watchdog = 0
    seeking = false
    shown = target
    video.dataset.shown = String(shown)
    onShown?.(shown)
    if (pending >= 0 && pending !== shown) {
      const next = pending
      pending = -1
      seekTo(next)
    } else {
      pending = -1
    }
  }

  const seekTo = (frame) => {
    target = frame
    video.dataset.frame = String(frame)
    const time = frameToTime(frame)
    if (Math.abs((video.currentTime || 0) - time) < 0.001) {
      settle()
      return
    }
    seeking = true
    video.currentTime = time
    watchdog = setTimer(() => {
      if (seeking) settle()
    }, SEEK_WATCHDOG_MS)
  }

  const onSeeked = () => {
    if (seeking) settle()
  }
  video.addEventListener('seeked', onSeeked)

  return {
    show(frame) {
      if (seeking) {
        pending = frame
        return
      }
      if (frame === shown) return
      seekTo(frame)
    },
    getShown: () => shown,
    destroy() {
      clearTimer(watchdog)
      video.removeEventListener('seeked', onSeeked)
    },
  }
}

// 页面上已经开始加载、还没加载完的图片（不算延迟加载、还没轮到的）。
// 只算视口上下两屏以内的：更远的图片不影响首屏观感，浏览器各自的延迟加载策略也不同。
export function countPendingImages(doc = document, viewportHeight = window.innerHeight) {
  return Array.from(doc.images || []).filter((image) => {
    if (!image.getAttribute('src') || image.complete || image.loading === 'lazy') return false
    const top = image.getBoundingClientRect?.().top ?? 0
    return top < viewportHeight * 2
  }).length
}

// 首屏的图片、字体都下载完再开始下载佛像视频，不和它们抢网速：
// 页面 load 之后，连续 quietMs 内没有新资源完成、并且页面上没有正在加载的图片才开始；最多再等 maxWaitMs。
// 只看“网络空了一会儿”不够：首页“山野手记”的图片要等脚本渲染后才请求，中间会空一段（2026-11-10 限速实测）。
export function waitForQuietNetwork(start, { quietMs = 1200, maxWaitMs = 10000, pendingImages = countPendingImages } = {}) {
  let quietTimer = 0
  let maxTimer = 0
  let observer = null
  let done = false

  const finish = () => {
    if (done) return
    done = true
    cleanup()
    start()
  }
  const armQuiet = () => {
    window.clearTimeout(quietTimer)
    quietTimer = window.setTimeout(() => (pendingImages() > 0 ? armQuiet() : finish()), quietMs)
  }
  const begin = () => {
    maxTimer = window.setTimeout(finish, maxWaitMs)
    if (typeof PerformanceObserver === 'function') {
      try {
        observer = new PerformanceObserver(armQuiet)
        observer.observe({ type: 'resource', buffered: false })
      } catch {
        observer = null
      }
    }
    armQuiet()
  }
  const cleanup = () => {
    window.clearTimeout(quietTimer)
    window.clearTimeout(maxTimer)
    observer?.disconnect()
    window.removeEventListener('load', begin)
  }

  if (document.readyState === 'complete') begin()
  else window.addEventListener('load', begin, { once: true })

  return () => {
    done = true
    cleanup()
  }
}
