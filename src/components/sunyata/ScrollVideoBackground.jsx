import { useEffect, useRef, useState } from 'react'
import {
  getScrollFollowOffset,
  getScrollStopAtViewportPosition,
  getScrollVideoProgress,
  getScrollVideoRange,
} from '../../lib/scrollVideo.js'
import {
  SCROLL_FRAME_COUNT,
  SCROLL_FRAME_SIZES,
  buildScrollFrameLoadOrder,
  findNearestLoadedFrame,
  getScrollFrameUrl,
  limitScrollFrameLoadOrder,
  pickScrollFrameSet,
  shouldLimitScrollFrames,
} from '../../lib/scrollFrames.js'

// 帧位置每个动画帧向目标靠近的比例；滚轮一格跳很多帧时也能平滑过渡。
const FRAME_EASING = 0.25
const LOAD_CONCURRENCY = 4
const POSTER_SRC = '/kling-buddha-scroll-poster.jpg'

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function applyFigureTransform(element, buddha, followOffset) {
  if (!element) {
    return
  }

  element.style.transform = `translate3d(${buddha.x}px, ${buddha.y + followOffset}px, 0px)`
  element.style.scale = `${(buddha.scale ?? 100) / 100}`
}

// 佛像随滚动"播放"：用预先导出的图片序列画在画布上。
// 以前直接拖视频进度，每次滚动都要跳转并解码视频，手机上佛像每秒只能刷新几次。
function ScrollVideoBackground({
  heroSectionRef,
  endSectionRef,
  stopTargetRef,
  rangeKey,
  scrollEndId = 'dialogue',
  buddha,
}) {
  const figureRef = useRef(null)
  const canvasRef = useRef(null)
  const rangeRef = useRef({ startScroll: 0, endScroll: 0 })
  const framesRef = useRef([])
  const shownFrameRef = useRef(-1)
  const framePositionRef = useRef(0)
  const rafRef = useRef(0)
  const requestDrawRef = useRef(() => {})
  const [reducedMotion] = useState(prefersReducedMotion)
  const [shouldLoadFrames, setShouldLoadFrames] = useState(
    () => !reducedMotion && window.scrollY > 0,
  )
  const [framesReady, setFramesReady] = useState(false)

  // 页面加载完、浏览器空闲时就开始下帧；访客先滚动则立即开始。
  useEffect(() => {
    if (shouldLoadFrames || reducedMotion) return undefined

    let idleId = 0
    let timerId = 0
    const start = () => setShouldLoadFrames(true)
    const scheduleIdle = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(start, { timeout: 2000 })
      } else {
        timerId = window.setTimeout(start, 600)
      }
    }

    window.addEventListener('scroll', start, { once: true, passive: true })
    if (document.readyState === 'complete') {
      scheduleIdle()
    } else {
      window.addEventListener('load', scheduleIdle, { once: true })
    }

    return () => {
      window.removeEventListener('scroll', start)
      window.removeEventListener('load', scheduleIdle)
      if (idleId && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId)
      }
      window.clearTimeout(timerId)
    }
  }, [reducedMotion, shouldLoadFrames])

  useEffect(() => {
    if (!shouldLoadFrames) return undefined
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const set = pickScrollFrameSet(window.innerWidth)
    const size = SCROLL_FRAME_SIZES[set]
    canvas.width = size.width
    canvas.height = size.height

    const frames = new Array(SCROLL_FRAME_COUNT).fill(null)
    framesRef.current = frames
    shownFrameRef.current = -1

    let order = buildScrollFrameLoadOrder(SCROLL_FRAME_COUNT)
    if (shouldLimitScrollFrames(navigator.connection)) {
      order = limitScrollFrameLoadOrder(order)
    }

    let cancelled = false
    let cursor = 0
    let active = 0
    let anyLoaded = false

    const loadNext = () => {
      while (!cancelled && active < LOAD_CONCURRENCY && cursor < order.length) {
        const index = order[cursor]
        const image = new Image()
        image.decoding = 'async'
        image.fetchPriority = cursor === 0 ? 'high' : 'low'
        cursor += 1
        active += 1

        const finish = (loaded) => {
          active -= 1
          if (cancelled) return
          if (loaded) {
            frames[index] = image
            if (!anyLoaded) {
              anyLoaded = true
              setFramesReady(true)
            }
            requestDrawRef.current()
          }
          loadNext()
        }

        image.onload = () => {
          // 提前解码，滚动画帧时不在主线程上临时解码。
          const decoded = typeof image.decode === 'function' ? image.decode() : Promise.resolve()
          decoded.then(() => finish(true), () => finish(true))
        }
        image.onerror = () => finish(false)
        image.src = getScrollFrameUrl(set, index)
      }
    }

    loadNext()

    return () => {
      cancelled = true
    }
  }, [shouldLoadFrames])

  useEffect(() => {
    const updateRange = () => {
      const heroSection = heroSectionRef.current
      const endSection = endSectionRef.current
      const stopTarget = stopTargetRef.current

      if (!heroSection || !endSection) {
        rangeRef.current = { startScroll: 0, endScroll: 0 }
        return
      }

      const heroTop = heroSection.getBoundingClientRect().top + window.scrollY
      const defaultEndTop = endSection.getBoundingClientRect().top + window.scrollY
      const defaultRange = getScrollVideoRange(
        heroTop,
        defaultEndTop,
        endSection.offsetHeight,
      )

      if (!stopTarget) {
        rangeRef.current = defaultRange
        return
      }

      const stopTargetTop =
        stopTarget.getBoundingClientRect().top + window.scrollY
      const stopScroll = getScrollStopAtViewportPosition(
        stopTargetTop,
        stopTarget.offsetHeight,
        window.innerHeight,
        (buddha.stopViewportY ?? 50) / 100,
      )

      rangeRef.current = {
        startScroll: defaultRange.startScroll,
        endScroll: Math.max(stopScroll, defaultRange.startScroll),
      }
    }

    updateRange()
    window.addEventListener('resize', updateRange)

    return () => {
      window.removeEventListener('resize', updateRange)
    }
  }, [buddha.stopViewportY, endSectionRef, heroSectionRef, rangeKey, stopTargetRef])

  useEffect(() => {
    const followOffset = () =>
      getScrollFollowOffset(
        window.scrollY,
        rangeRef.current.startScroll,
        rangeRef.current.endScroll,
      )

    applyFigureTransform(figureRef.current, buddha, followOffset())

    if (reducedMotion) {
      // 减少动态效果：只保留静态海报，不下帧、不监听滚动换帧。
      return undefined
    }

    const drawFrame = (position) => {
      const frames = framesRef.current
      const canvas = canvasRef.current
      const index = findNearestLoadedFrame(frames, position)
      if (index < 0 || index === shownFrameRef.current || !canvas) return
      const context = canvas.getContext('2d')
      if (!context) return
      context.drawImage(frames[index], 0, 0, canvas.width, canvas.height)
      shownFrameRef.current = index
    }

    const tick = () => {
      rafRef.current = 0
      applyFigureTransform(figureRef.current, buddha, followOffset())

      const progress = getScrollVideoProgress(
        window.scrollY,
        rangeRef.current.startScroll,
        rangeRef.current.endScroll,
      )
      const target = progress * (SCROLL_FRAME_COUNT - 1)
      const delta = target - framePositionRef.current
      framePositionRef.current =
        progress === 0 || Math.abs(delta) < 0.5
          ? target
          : framePositionRef.current + delta * FRAME_EASING

      drawFrame(framePositionRef.current)

      if (framePositionRef.current !== target) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    const requestDraw = () => {
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    requestDrawRef.current = requestDraw
    requestDraw()
    window.addEventListener('scroll', requestDraw, { passive: true })
    window.addEventListener('resize', requestDraw)

    return () => {
      requestDrawRef.current = () => {}
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
      window.removeEventListener('scroll', requestDraw)
      window.removeEventListener('resize', requestDraw)
    }
  }, [buddha, reducedMotion])

  return (
    <div
      ref={figureRef}
      className={`hero-scroll-figure${framesReady ? ' is-ready' : ''}`}
      data-testid="hero-scroll-figure"
      data-layer="video"
      data-render-mode="image-sequence"
      data-scroll-end={scrollEndId}
      data-scroll-follow="page"
      data-visual-layer="overlay"
      data-stop-target="input-center"
      data-stop-viewport={String(buddha.stopViewportY ?? 50)}
      data-scale={String(buddha.scale ?? 100)}
      data-feather-range={String(buddha.featherRange ?? 84)}
      data-feather-strength={String(buddha.featherStrength ?? 68)}
      aria-hidden="true"
      style={{
        aspectRatio: '1024 / 682',
        transform: `translate3d(${buddha.x}px, ${buddha.y}px, 0px)`,
        scale: `${(buddha.scale ?? 100) / 100}`,
        '--buddha-feather-range': `${buddha.featherRange ?? 84}%`,
        '--buddha-feather-strength': `${(buddha.featherStrength ?? 68) / 100}`,
      }}
    >
      <img
        className="hero-scroll-poster"
        data-testid="scroll-poster"
        src={POSTER_SRC}
        alt=""
        width="1280"
        height="854"
        fetchPriority="high"
        decoding="async"
      />
      <canvas
        ref={canvasRef}
        className="hero-scroll-canvas"
        data-testid="scroll-frames"
      />
      <div className="hero-scroll-feather" />
    </div>
  )
}

export default ScrollVideoBackground
