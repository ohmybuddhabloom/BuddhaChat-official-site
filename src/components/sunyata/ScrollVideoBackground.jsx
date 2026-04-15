import { useEffect, useRef, useState } from 'react'
import {
  getScrollFollowOffset,
  getScrollStopAtViewportPosition,
  getScrollVideoProgress,
  getScrollVideoRange,
  getScrollVideoTime,
} from '../../lib/scrollVideo.js'

const TIME_EASING = 0.18
const MIN_TIME_DELTA = 1 / 120

function waitForVideoReady(video) {
  if (video.readyState >= 3) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    video.addEventListener('canplay', resolve, { once: true })
  })
}

function applyFigureTransform(element, buddha, followOffset) {
  if (!element) {
    return
  }

  element.style.transform = `translate3d(${buddha.x}px, ${buddha.y + followOffset}px, 0px)`
  element.style.scale = `${(buddha.scale ?? 100) / 100}`
}

function ScrollVideoBackground({
  heroSectionRef,
  endSectionRef,
  stopTargetRef,
  rangeKey,
  scrollEndId = 'dialogue',
  buddha,
}) {
  const figureRef = useRef(null)
  const videoRef = useRef(null)
  const rangeRef = useRef({ startScroll: 0, endScroll: 0 })
  const durationRef = useRef(0)
  const targetTimeRef = useRef(0)
  const renderedTimeRef = useRef(0)
  const rafRef = useRef(0)
  const [frameAspectRatio, setFrameAspectRatio] = useState('4 / 5')
  const [videoReady, setVideoReady] = useState(false)

  useEffect(() => {
    const video = videoRef.current

    if (!video) {
      return undefined
    }

    let cancelled = false

    const hydrateVideo = async () => {
      await waitForVideoReady(video)

      if (cancelled || !video.videoWidth || !video.videoHeight || !video.duration) {
        return
      }

      durationRef.current = video.duration
      setFrameAspectRatio(`${video.videoWidth} / ${video.videoHeight}`)
      video.currentTime = 0

      if (!cancelled) {
        setVideoReady(true)
      }
    }

    hydrateVideo()

    return () => {
      cancelled = true
    }
  }, [])

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
    applyFigureTransform(
      figureRef.current,
      buddha,
      getScrollFollowOffset(
        window.scrollY,
        rangeRef.current.startScroll,
        rangeRef.current.endScroll,
      ),
    )
  }, [buddha])

  useEffect(() => {
    if (!videoReady) {
      return undefined
    }

    const video = videoRef.current

    if (!video) {
      return undefined
    }

    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      video.currentTime = 0
      applyFigureTransform(
        figureRef.current,
        buddha,
        getScrollFollowOffset(
          window.scrollY,
          rangeRef.current.startScroll,
          rangeRef.current.endScroll,
        ),
      )
      return undefined
    }

    const tick = () => {
      const delta = targetTimeRef.current - renderedTimeRef.current

      if (Math.abs(delta) <= MIN_TIME_DELTA) {
        renderedTimeRef.current = targetTimeRef.current
        video.currentTime = renderedTimeRef.current
        rafRef.current = 0
        return
      }

      renderedTimeRef.current += delta * TIME_EASING
      video.currentTime = renderedTimeRef.current
      rafRef.current = requestAnimationFrame(tick)
    }

    const queueRender = () => {
      applyFigureTransform(
        figureRef.current,
        buddha,
        getScrollFollowOffset(
          window.scrollY,
          rangeRef.current.startScroll,
          rangeRef.current.endScroll,
        ),
      )

      const progress = getScrollVideoProgress(
        window.scrollY,
        rangeRef.current.startScroll,
        rangeRef.current.endScroll,
      )
      targetTimeRef.current = getScrollVideoTime(
        window.scrollY,
        rangeRef.current.startScroll,
        rangeRef.current.endScroll,
        durationRef.current,
      )

      if (progress === 0) {
        renderedTimeRef.current = Math.min(renderedTimeRef.current, targetTimeRef.current)
      }

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    queueRender()
    window.addEventListener('scroll', queueRender, { passive: true })
    window.addEventListener('resize', queueRender)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }

      window.removeEventListener('scroll', queueRender)
      window.removeEventListener('resize', queueRender)
    }
  }, [buddha, videoReady])

  return (
    <div
      ref={figureRef}
      className={`hero-scroll-figure${videoReady ? ' is-ready' : ''}`}
      data-testid="hero-scroll-figure"
      data-layer="video"
      data-render-mode="direct-video"
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
        aspectRatio: frameAspectRatio,
        transform: `translate3d(${buddha.x}px, ${buddha.y}px, 0px)`,
        scale: `${(buddha.scale ?? 100) / 100}`,
        '--buddha-feather-range': `${buddha.featherRange ?? 84}%`,
        '--buddha-feather-strength': `${(buddha.featherStrength ?? 68) / 100}`,
      }}
    >
      <video
        ref={videoRef}
        className="hero-scroll-video"
        data-testid="scroll-video"
        poster="/kling-buddha-scroll-poster.jpg"
        muted
        playsInline
        preload="auto"
      >
        <source src="/kling-buddha-scroll-scrub.mp4" type="video/mp4" />
      </video>
      <div className="hero-scroll-feather" />
    </div>
  )
}

export default ScrollVideoBackground
