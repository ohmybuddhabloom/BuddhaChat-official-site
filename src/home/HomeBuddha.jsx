import { useEffect, useRef, useState } from 'react'
import { createLatestSeeker, HERO_FRAME_COUNT, waitForQuietNetwork } from '../lib/heroMotion.js'
import { SPLIT_FRAME, getSegmentUrl, getStickProgress, locateFrame, pickVideoSet } from './buddhaMotion.js'
import { createFrameAnimator } from '../lib/frameAnimator.js'

// 跟手程度：技能默认 0.11 秒缓动、每秒最多 290 帧，滚一格要约 0.45 秒才停稳，整段至少 0.5 秒走完。
// 浏览器本身对滚轮已有平滑滚动，这里只留很短的缓动吸收触控板抖动，不再限制速度。
export const FOLLOW_SMOOTH_TIME = 0.03
export const FOLLOW_MAX_SPEED = HERO_FRAME_COUNT * 20

// 首页佛像（oil-motion：baked-video + frame-scrub）。
//
// 位置：佛像放在一条从首屏延伸到问答段的“轨道”里，用浏览器原生的 position: sticky 吸住，
// 轨道走完就随页面离开。不再用脚本每帧改位置，滑动时不会比页面慢一拍而抖动。
// 轨道起止全由 home.css 的版式决定（宽屏：停在问答标题右侧；手机：停在问答标题上方）。
//
// 画面：145 帧拆成两段全关键帧视频。a 段（第 0～47 帧，手机 0.55 MB）页面加载完就下载，
// 一滑就能动；b 段（第 48～144 帧）等页面其余资源下完再下载，不和图片抢网速。
// 只差 b 段时停在第 47 帧，下完自动接上。
function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// 苹果 Safari：视频没播放过就不解码画面，设 currentTime 也不换帧。先静音播放再暂停；
// 低电量模式不允许自动播放时，等访客第一次点按（苹果只认 touchend / click，不认滑动开始的 touchstart）。
function prime(video) {
  return Promise.resolve()
    .then(() => video.play())
    .then(
      () => {
        video.pause()
        return true
      },
      () => false,
    )
}

function loadInto(video, url, signal) {
  return fetch(url, { priority: 'low', signal })
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status))
      return response.blob()
    })
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const objectUrl = URL.createObjectURL(blob)
          video.addEventListener('loadedmetadata', () => resolve(objectUrl), { once: true })
          video.addEventListener('error', () => reject(new Error('decode')), { once: true })
          video.src = objectUrl
          video.load()
        }),
    )
}

function HomeBuddha() {
  const trackRef = useRef(null)
  const stickyRef = useRef(null)
  const videoARef = useRef(null)
  const videoBRef = useRef(null)
  const [visiblePart, setVisiblePart] = useState('')

  useEffect(() => {
    if (prefersReducedMotion()) return undefined
    const track = trackRef.current
    const sticky = stickyRef.current
    const videos = { a: videoARef.current, b: videoBRef.current }
    if (!track || !sticky || !videos.a || !videos.b) return undefined

    // 静音必须由脚本设：React 生成静态网页时不写 muted 属性，接管时也不补，
    // 不静音的视频在苹果上不能自动播放，预热会失败（2026-11-11 接管测试发现）。
    for (const video of Object.values(videos)) {
      video.muted = true
      video.defaultMuted = true
      video.setAttribute('muted', '')
    }
    const set = pickVideoSet(window.innerWidth)
    const controller = typeof AbortController === 'function' ? new AbortController() : null
    const objectUrls = []
    const seekers = {}
    const ready = { a: false, b: false }
    let cancelled = false
    let animator = null
    let lastFrame = 0
    let geometry = null
    let raf = 0
    let removeGesture = () => {}
    let stopWaitingB = () => {}
    let bRequested = false

    const measure = () => {
      const rect = track.getBoundingClientRect()
      geometry = {
        trackTop: rect.top + window.scrollY,
        trackHeight: rect.height,
        figureHeight: sticky.offsetHeight,
        stickTop: parseFloat(getComputedStyle(sticky).top) || 0,
      }
    }

    const render = (frame) => {
      lastFrame = frame
      const { part, local } = locateFrame(frame, ready.b)
      if (!ready[part]) return
      seekers[part].show(local)
      if (frame >= SPLIT_FRAME - 8) requestB()
    }

    const onShown = (part) => () => {
      if (!cancelled) setVisiblePart(part)
    }

    const activate = (part) => {
      if (cancelled || ready[part]) return
      ready[part] = true
      seekers[part] = createLatestSeeker(videos[part], { onShown: onShown(part) })
      if (!animator) {
        animator = createFrameAnimator({ frameCount: HERO_FRAME_COUNT, render, smoothTime: FOLLOW_SMOOTH_TIME, maxSpeed: FOLLOW_MAX_SPEED })
      }
      animator.redraw()
      render(lastFrame)
    }

    const primeThenActivate = (part) =>
      prime(videos[part]).then((ok) => {
        if (cancelled) return
        if (ok) {
          activate(part)
          return
        }
        const events = ['touchend', 'click', 'pointerup', 'keydown']
        const onGesture = () => {
          removeGesture()
          prime(videos.a).then((okA) => okA && activate('a'))
          if (videos.b.src) prime(videos.b).then((okB) => okB && activate('b'))
        }
        events.forEach((name) => window.addEventListener(name, onGesture, { once: true, passive: true }))
        removeGesture = () => events.forEach((name) => window.removeEventListener(name, onGesture))
      })

    const load = (part) =>
      loadInto(videos[part], getSegmentUrl(set, part), controller?.signal)
        .then((objectUrl) => {
          objectUrls.push(objectUrl)
          return primeThenActivate(part)
        })
        .catch(() => {
          // 下载失败就一直显示静态封面，不影响页面其他部分。
        })

    function requestB() {
      if (bRequested) return
      bRequested = true
      stopWaitingB()
      load('b')
    }

    const tick = () => {
      raf = 0
      if (!geometry) measure()
      animator?.setProgress(getStickProgress(window.scrollY, geometry))
    }
    const requestTick = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const onResize = () => {
      measure()
      requestTick()
    }

    measure()
    window.addEventListener('scroll', requestTick, { passive: true })
    window.addEventListener('resize', onResize)
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : null
    observer?.observe(track)

    // a 段：页面加载完就开始（下面的图片都是延迟加载，此时不抢首屏）；访客先滑动就立刻开始。
    let aStarted = false
    const startA = () => {
      if (aStarted) return
      aStarted = true
      window.removeEventListener('scroll', startA)
      load('a').then(() => {
        // b 段：等页面其余资源下完、网络空下来。
        if (!cancelled && !bRequested) stopWaitingB = waitForQuietNetwork(requestB)
      })
    }
    window.addEventListener('scroll', startA, { once: true, passive: true })
    if (document.readyState === 'complete') startA()
    else window.addEventListener('load', startA, { once: true })

    return () => {
      cancelled = true
      removeGesture()
      stopWaitingB()
      controller?.abort()
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', requestTick)
      window.removeEventListener('scroll', startA)
      window.removeEventListener('load', startA)
      window.removeEventListener('resize', onResize)
      observer?.disconnect()
      animator?.destroy()
      Object.values(seekers).forEach((seeker) => seeker.destroy())
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  return (
    <div ref={trackRef} className="home-buddha-track" aria-hidden="true">
      <div
        ref={stickyRef}
        className="hero-scroll-figure home-buddha is-ready"
        data-testid="home-buddha"
        data-part={visiblePart}
        data-hero-ready={visiblePart ? '1' : undefined}
      >
        <picture>
          <source media="(max-width: 900px)" srcSet="/home/buddha-poster-768.webp" type="image/webp" />
          <source srcSet="/home/buddha-poster-1280.webp" type="image/webp" />
          <img
            className="hero-scroll-poster"
            src="/kling-buddha-scroll-poster.jpg"
            alt=""
            width="1280"
            height="854"
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <video
          ref={videoARef}
          className={`hero-scroll-video${visiblePart === 'a' ? ' is-visible' : ''}`}
          data-testid="home-buddha-video-a"
          playsInline
          disablePictureInPicture
          preload="none"
          tabIndex={-1}
        />
        <video
          ref={videoBRef}
          className={`hero-scroll-video${visiblePart === 'b' ? ' is-visible' : ''}`}
          data-testid="home-buddha-video-b"
          playsInline
          disablePictureInPicture
          preload="none"
          tabIndex={-1}
        />
        <div className="hero-scroll-feather" />
      </div>
    </div>
  )
}

export default HomeBuddha
