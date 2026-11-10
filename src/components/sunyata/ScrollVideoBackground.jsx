import { useEffect, useRef, useState } from 'react'
import {
  getDockAboveScroll,
  getScrollFollowOffset,
  getScrollStopAtViewportPosition,
  getScrollVideoProgress,
  getScrollVideoRange,
} from '../../lib/scrollVideo.js'
import {
  HERO_FRAME_COUNT,
  HERO_VIDEO_SIZES,
  createLatestSeeker,
  getHeroVideoUrl,
  pickHeroVideoSet,
  waitForQuietNetwork,
} from '../../lib/heroMotion.js'
import { createFrameAnimator } from '../../lib/frameAnimator.js'

const POSTER_SRC = '/kling-buddha-scroll-poster.jpg'

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

// 支持滚动驱动动画的浏览器（Chrome 115+、Safari 26+）由浏览器在合成线程上跟随滚动，
// 不再每帧用脚本改位置，滑动时不会比页面慢一拍而抖动。
function supportsScrollTimeline() {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('animation-timeline: scroll()')
  )
}

const MOBILE_LAYOUT_QUERY = '(max-width: 900px)'

function applyFigureTransform(element, buddha, followOffset) {
  if (!element) {
    return
  }

  element.style.transform = `translate3d(${buddha.x}px, ${buddha.y + followOffset}px, 0px)`
  element.style.scale = `${(buddha.scale ?? 100) / 100}`
}

// 跟随距离交给 CSS：translate 属性在 scale 外层，所以距离要乘 scale，和原来写在 transform 里的效果一致。
function applyCssFollow(element, range, scale) {
  if (!element) return
  const distance = Math.max(range.endScroll - range.startScroll, 0) * scale
  element.style.setProperty('--follow-start', `${range.startScroll}px`)
  element.style.setProperty('--follow-end', `${Math.max(range.endScroll, range.startScroll + 1)}px`)
  element.style.setProperty('--follow-distance', `${distance}px`)
}

// 佛像随滚动逐帧推进（oil-motion：baked-video + frame-scrub）。
// 一个全关键帧 MP4：每一帧都能直接定位，不用像普通视频那样从前一个关键帧解码过来。
// 视频整段下载到内存后才挂上去，滚动时的定位不再等网络；首屏资源下完、网络空下来才开始下载。
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
  const seekerRef = useRef(null)
  const animatorRef = useRef(null)
  const [reducedMotion] = useState(prefersReducedMotion)
  const [cssFollow] = useState(() => !reducedMotion && supportsScrollTimeline())
  const [shouldLoad, setShouldLoad] = useState(() => !reducedMotion && window.scrollY > 0)
  const [videoReady, setVideoReady] = useState(false)

  // 访客一滚动就开始下载；否则等首屏资源下完、网络空下来。
  useEffect(() => {
    if (shouldLoad || reducedMotion) return undefined
    const start = () => setShouldLoad(true)
    // 不能提前：2026-11-11 实测提前到 1.4 秒开始下载，“山野手记”图片被挤到 13 秒才下完。
    // 想让佛像早点动，要把视频分段（先下一小段），见 docs/web-performance-plan.md。
    const stopWaiting = waitForQuietNetwork(start)
    window.addEventListener('scroll', start, { once: true, passive: true })
    return () => {
      stopWaiting()
      window.removeEventListener('scroll', start)
    }
  }, [reducedMotion, shouldLoad])

  useEffect(() => {
    if (!shouldLoad) return undefined
    const video = videoRef.current
    if (!video) return undefined

    const set = pickHeroVideoSet(window.innerWidth)
    let cancelled = false
    let objectUrl = ''
    const controller = typeof AbortController === 'function' ? new AbortController() : null

    // 苹果 Safari：视频没播放过就不解码画面，设 currentTime 也不换帧、不发 seeked。
    // 先静音播放一下再暂停；低电量模式等不允许自动播放时，等访客第一次触摸再做。
    const prime = () =>
      Promise.resolve()
        .then(() => video.play())
        .then(
          () => {
            video.pause()
            return true
          },
          () => false,
        )
    let removeGestureListener = () => {}

    const startScrub = () => {
      if (cancelled || seekerRef.current) return
      const seeker = createLatestSeeker(video, {
        onShown: () => setVideoReady(true),
      })
      seekerRef.current = seeker
      animatorRef.current = createFrameAnimator({
        frameCount: HERO_FRAME_COUNT,
        render: (frame) => seeker.show(frame),
      })
      animatorRef.current.redraw()
      window.dispatchEvent(new Event('hero-motion-ready'))
    }

    const onMetadata = () => {
      if (cancelled) return
      prime().then((primed) => {
        if (cancelled) return
        if (primed) {
          startScrub()
          return
        }
        const onGesture = () => {
          removeGestureListener()
          prime().then((ok) => ok && startScrub())
        }
        // 苹果只把 touchend / click 算作用户操作，touchstart（滑动开始）不算。
        const gestureEvents = ['pointerdown', 'touchstart', 'touchend', 'click']
        gestureEvents.forEach((name) =>
          window.addEventListener(name, onGesture, { once: true, passive: true }),
        )
        removeGestureListener = () => {
          gestureEvents.forEach((name) => window.removeEventListener(name, onGesture))
        }
      })
    }

    video.addEventListener('loadedmetadata', onMetadata, { once: true })
    fetch(getHeroVideoUrl(set), { priority: 'low', signal: controller?.signal })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status))
        return response.blob()
      })
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        video.src = objectUrl
        video.load()
      })
      .catch(() => {
        // 下载失败就一直显示静态封面，不影响页面其他部分。
      })

    return () => {
      cancelled = true
      removeGestureListener()
      controller?.abort()
      video.removeEventListener('loadedmetadata', onMetadata)
      animatorRef.current?.destroy()
      animatorRef.current = null
      seekerRef.current?.destroy()
      seekerRef.current = null
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [shouldLoad])

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

      let endScroll = Math.max(stopScroll, defaultRange.startScroll)

      // 手机上标题在佛像下方：佛像停在标题上方，不让标题从佛像身上滑过去。
      const copy = endSection.querySelector('.interlude-copy')
      const figure = figureRef.current
      const space = figure?.parentElement
      if (copy && figure && space && window.matchMedia?.(MOBILE_LAYOUT_QUERY).matches) {
        const scale = (buddha.scale ?? 100) / 100
        const spaceRect = space.getBoundingClientRect()
        endScroll = getDockAboveScroll({
          startScroll: defaultRange.startScroll,
          figureCenterAtStart:
            spaceRect.top + window.scrollY + spaceRect.height / 2 + (buddha.y ?? 0) * scale,
          figureHeight: figure.offsetHeight * scale,
          scale,
          copyTop: copy.getBoundingClientRect().top + window.scrollY,
        })
      }

      rangeRef.current = {
        startScroll: defaultRange.startScroll,
        endScroll,
      }
      if (cssFollow) {
        applyCssFollow(figure, rangeRef.current, (buddha.scale ?? 100) / 100)
      }
    }

    updateRange()
    window.addEventListener('resize', updateRange)
    // 字体、图片加载完会把下面的段落往下推，停靠位置要跟着重算。
    const observer =
      typeof ResizeObserver === 'function' ? new ResizeObserver(() => updateRange()) : null
    observer?.observe(document.body)

    return () => {
      window.removeEventListener('resize', updateRange)
      observer?.disconnect()
    }
  }, [buddha.scale, buddha.stopViewportY, buddha.y, cssFollow, endSectionRef, heroSectionRef, rangeKey, stopTargetRef])

  useEffect(() => {
    const followOffset = () =>
      cssFollow
        ? 0
        : getScrollFollowOffset(
        window.scrollY,
        rangeRef.current.startScroll,
        rangeRef.current.endScroll,
      )

    applyFigureTransform(figureRef.current, buddha, followOffset())

    if (reducedMotion) {
      // 减少动态效果：只保留静态封面，不下载视频、不随滚动换帧。
      return undefined
    }

    let raf = 0
    const tick = () => {
      raf = 0
      if (!cssFollow) applyFigureTransform(figureRef.current, buddha, followOffset())
      animatorRef.current?.setProgress(
        getScrollVideoProgress(
          window.scrollY,
          rangeRef.current.startScroll,
          rangeRef.current.endScroll,
        ),
      )
    }

    // 事件里只记一下，实际计算放到下一个动画帧，每帧最多一次 DOM 写入。
    const requestDraw = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }

    requestDraw()
    window.addEventListener('scroll', requestDraw, { passive: true })
    window.addEventListener('resize', requestDraw)
    window.addEventListener('hero-motion-ready', requestDraw)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', requestDraw)
      window.removeEventListener('resize', requestDraw)
      window.removeEventListener('hero-motion-ready', requestDraw)
    }
  }, [buddha, cssFollow, reducedMotion])

  return (
    <div
      ref={figureRef}
      className={`hero-scroll-figure${videoReady ? ' is-ready' : ''}${cssFollow ? ' is-css-follow' : ''}`}
      data-testid="hero-scroll-figure"
      data-layer="video"
      data-render-mode="baked-video"
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
      <video
        ref={videoRef}
        className="hero-scroll-video"
        data-testid="scroll-video"
        width={HERO_VIDEO_SIZES.d.width}
        height={HERO_VIDEO_SIZES.d.height}
        muted
        playsInline
        disablePictureInPicture
        preload="none"
        tabIndex={-1}
      />
      <div className="hero-scroll-feather" />
    </div>
  )
}

export default ScrollVideoBackground
