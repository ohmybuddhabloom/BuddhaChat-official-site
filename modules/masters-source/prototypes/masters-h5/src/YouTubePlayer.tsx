import { useEffect, useRef } from 'react'

type Player = {
  getCurrentTime(): number
  getPlayerState(): number
  pauseVideo(): void
  destroy(): void
}
type PlayerEvent = { target: Player }
type YouTubeApi = {
  Player: new (element: HTMLElement, options: {
    width: string
    height: string
    videoId: string
    playerVars: { autoplay: number; start: number; playsinline: number; origin: string }
    events: {
      onReady(event: PlayerEvent): void
      onStateChange(event: PlayerEvent & { data: number }): void
      onError(event: PlayerEvent & { data: number }): void
    }
  }) => Player
}
declare global {
  interface Window {
    YT?: YouTubeApi
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<YouTubeApi> | undefined

function loadApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady
    let finished = false
    const script = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]') ?? document.createElement('script')
    const settle = (error?: Error) => {
      if (finished) return
      finished = true
      window.clearTimeout(timeout)
      script.removeEventListener('error', onError)
      window.onYouTubeIframeAPIReady = previousReady
      if (error) reject(error)
      else if (window.YT?.Player) resolve(window.YT)
      else reject(new Error('视频播放器未能初始化，请刷新重试。'))
    }
    const onError = () => settle(new Error('无法连接 YouTube，请检查网络后重试。'))
    const timeout = window.setTimeout(() => settle(new Error('YouTube 加载超时，请检查网络后刷新重试。')), 15000)
    window.onYouTubeIframeAPIReady = () => {
      try { previousReady?.() } finally { settle() }
    }
    script.addEventListener('error', onError)
    if (!script.isConnected) {
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      document.head.append(script)
    }
  })
  return apiPromise
}

type Props = {
  videoId: string
  title: string
  startSeconds: number
  onProgress(seconds: number): void
  onStatus(message: string): void
}

export default function YouTubePlayer({ videoId, title, startSeconds, onProgress, onStatus }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const callbacks = useRef({ onProgress, onStatus })
  callbacks.current = { onProgress, onStatus }
  // A progress update must not recreate the player or seek it backwards.
  const startRef = useRef(startSeconds)
  startRef.current = startSeconds

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let player: Player | undefined
    let observedPlayback = false
    let ready = false
    let interval: number | undefined
    let readyTimeout: number | undefined
    const save = () => {
      if (!player || !ready || !observedPlayback) return
      try {
        const seconds = player.getCurrentTime()
        if (Number.isFinite(seconds) && seconds >= 0) callbacks.current.onProgress(seconds)
      } catch { /* The iframe may already have been removed by the browser. */ }
    }
    const suspend = () => {
      save()
      if (ready) {
        try { player?.pauseVideo() } catch { /* A detached iframe cannot receive commands. */ }
      }
    }
    const visibility = () => { if (document.visibilityState === 'hidden') suspend() }
    window.addEventListener('pagehide', suspend)
    document.addEventListener('visibilitychange', visibility)
    callbacks.current.onStatus('正在连接 YouTube…')

    void loadApi().then((api) => {
      if (disposed) return
      const mount = document.createElement('div')
      host.replaceChildren(mount)
      readyTimeout = window.setTimeout(() => {
        if (!disposed && !ready) callbacks.current.onStatus('视频连接超时，请检查网络或稍后重试。')
      }, 15000)
      player = new api.Player(mount, {
        width: '100%', height: '100%', videoId,
        playerVars: {
          autoplay: 0, playsinline: 1, origin: window.location.origin,
          start: Number.isFinite(startRef.current) && startRef.current > 0 ? Math.floor(startRef.current) : 0,
        },
        events: {
          onReady: () => {
            if (disposed) return
            ready = true
            window.clearTimeout(readyTimeout)
            callbacks.current.onStatus('播放器已就绪，点击播放。')
            interval = window.setInterval(() => {
              try { if (player && [1, 2].includes(player.getPlayerState())) save() } catch { /* Detached iframe. */ }
            }, 2000)
          },
          onStateChange: ({ data }) => {
            if (disposed) return
            if (data === 1 || data === 2) observedPlayback = true
            if (data === 1) callbacks.current.onStatus('正在播放')
            if (data === 2) { save(); callbacks.current.onStatus('已暂停') }
            if (data === 0) { save(); callbacks.current.onStatus('播放结束') }
            if (data === 3) callbacks.current.onStatus('正在缓冲…')
          },
          onError: ({ data }) => {
            if (disposed) return
            window.clearTimeout(readyTimeout)
            const message = data === 100 ? '视频已被移除或设为私密。'
              : [101, 150].includes(data) ? '此视频不允许嵌入播放。'
                : data === 153 ? 'YouTube 无法验证播放器来源，请在原站观看。'
                  : '视频播放失败，请稍后重试或在原站观看。'
            callbacks.current.onStatus(message)
          },
        },
      })
    }).catch((error: unknown) => {
      if (!disposed) callbacks.current.onStatus(error instanceof Error ? error.message : '视频加载失败，请稍后重试。')
    })

    return () => {
      save()
      disposed = true
      window.clearInterval(interval)
      window.clearTimeout(readyTimeout)
      window.removeEventListener('pagehide', suspend)
      document.removeEventListener('visibilitychange', visibility)
      try { player?.destroy() } catch { /* React may already have detached the host. */ }
      host.replaceChildren()
    }
  }, [videoId])

  return <div ref={hostRef} className="yt-host" aria-label={title} style={{ width: '100%', height: '100%' }} />
}
