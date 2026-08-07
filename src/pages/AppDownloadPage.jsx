import { useEffect, useRef, useState } from 'react'

import AndroidInstallGuide, {
  AndroidDownloadNote,
} from '../components/download/AndroidInstallGuide.jsx'
import { trackCtaClick } from '../lib/analytics.js'
import { copyText } from '../lib/copyText.js'
import { detectDownloadPlatform, isWeChatBrowser } from '../lib/downloadPlatform.js'
import { fetchAndroidRelease } from '../lib/androidRelease.js'

/**
 * Campaign targets that map a `/download?target=...` URL to an in-app deep link.
 * The APP resolves `buddhachat://l/<slug>` through its smart-link contract.
 */
const CAMPAIGN_DEEP_LINKS = {
  'yuanhui-registration': 'buddhachat://l/yuanhui_registration',
}

function buildCampaignDeepLink() {
  try {
    const params = new URLSearchParams(window.location.search)
    const target = params.get('target')
    const activity = params.get('activity')
    const slug = CAMPAIGN_DEEP_LINKS[target]
    if (!slug) return null
    if (!activity) return slug
    const separator = slug.includes('?') ? '&' : '?'
    return `${slug}${separator}activity=${encodeURIComponent(activity)}`
  } catch {
    return null
  }
}

/**
 * Tries to open the campaign deep link when the APP is installed. On Android we
 * route through an intent so Chrome can fall back to this page if the APP is
 * missing; on iOS we fire the custom scheme and show a small hint. The download
 * page itself always remains as the manual fallback.
 */
function useCampaignDeepLink() {
  const [attempted, setAttempted] = useState(false)
  useEffect(() => {
    const deepLink = buildCampaignDeepLink()
    if (!deepLink || attempted) return
    setAttempted(true)

    if (detectDownloadPlatform() === 'android' && !isWeChatBrowser()) {
      // Chrome resolves custom-scheme intents natively; other Android browsers
      // follow the javascript: navigation. WeChat blocks it, so skip there.
      try {
        const fallback = encodeURIComponent(window.location.href)
        window.location.href = `intent://l/${deepLink.split('//')[1]}#Intent;scheme=buddhachat;S.browser_fallback_url=${fallback};end`
      } catch {
        // ignore — the page remains a download fallback
      }
      return
    }

    // iOS (and non-Chrome Android fallback): fire the scheme and let the app
    // handler take over; if nothing handles it, the page just stays put.
    try {
      window.location.href = deepLink
    } catch {
      // ignore
    }
  }, [attempted])
}

const DOWNLOADS = {
  ios: {
    label: 'App Store 下载',
    icon: '/download-icons/apple-official.svg',
    url: import.meta.env.VITE_APP_STORE_URL || 'https://apps.apple.com/app/id6762049050',
  },
  google: {
    label: 'Google Play 下载',
    icon: '/download-icons/google-play.png',
    url:
      import.meta.env.VITE_GOOGLE_PLAY_URL ||
      'https://play.google.com/store/apps/details?id=com.chriskevin.buddhachat',
  },
  apk: {
    label: '安卓安装包下载',
    icon: '/download-icons/android.png',
    url: import.meta.env.VITE_ANDROID_APK_URL || '/download/android/latest.apk',
  },
}

const PREVIEWS = [
  {
    src: '/app-previews/app-ai-buddha-mobile.avif',
    alt: 'BuddhaChat AI 佛祖对话真实页面',
    title: 'AI 佛祖对话',
    description: '随时倾诉与请教，AI 以佛法视角回应，陪你安顿身心。',
  },
  {
    src: '/app-previews/app-home-mobile.avif',
    alt: 'BuddhaChat 首页真实页面',
    title: '每日法师推荐',
    description: '每日推荐法师开示与最新内容，也可切换问答，找到当下关心的佛法回应。',
  },
  {
    src: '/app-previews/app-master-talks-mobile.avif',
    alt: 'BuddhaChat 法师开示真实页面',
    title: '法师开示',
    description: '源慧法师等法师的视频开示与修心内容，让心慢下来。',
  },
  {
    src: '/app-previews/app-practice-mobile.avif',
    alt: 'BuddhaChat 每日修行真实页面',
    title: '持续修行',
    description: '禅修、木鱼、诵经与连续天数记录，把修行变成每天的习惯。',
  },
  {
    src: '/app-previews/app-music-mobile.avif',
    alt: 'BuddhaChat 佛乐场景真实页面',
    title: '佛乐相伴',
    description: '按静心、睡眠、专注等场景聆听佛乐，让声音陪伴禅修与日常安住。',
  },
  {
    src: '/app-previews/app-scriptures-mobile.avif',
    alt: 'BuddhaChat 读经导航真实页面',
    title: 'AI 解读与读经',
    description: '海量经文可检索阅读，支持 AI 白话解读与 AI 读经，让经典更易懂、更易坚持。',
  },
  {
    src: '/app-previews/app-community-mobile.avif',
    alt: 'BuddhaChat 道场与共修社区真实页面',
    title: '道场共修',
    description: '找到精选道场与推荐法师，和同修一起交流精进。',
  },
]

function DownloadAction({
  downloadKey,
  forceNormal = false,
  onWeChatDownload,
  url,
}) {
  const download = { ...DOWNLOADS[downloadKey], url: url ?? DOWNLOADS[downloadKey].url }
  const isReady = Boolean(download.url)

  if (!isReady) {
    if (forceNormal) {
      return (
        <div className="campaign-download-action">
          <img className={`is-${downloadKey}`} src={download.icon} alt="" />
          <span>{download.label}</span>
        </div>
      )
    }

    return (
      <div className="campaign-download-action is-disabled" aria-disabled="true">
        <img className={`is-${downloadKey}`} src={download.icon} alt="" />
        <span>
          {download.label}
          <small>下载地址配置中</small>
        </span>
      </div>
    )
  }

  return (
    <a
      className="campaign-download-action"
      href={download.url}
      onClick={(event) => {
        trackCtaClick(`app_download_${downloadKey}`, 'app')
        if (onWeChatDownload) {
          event.preventDefault()
          onWeChatDownload(download)
          return
        }
      }}
      rel="noreferrer"
    >
      <img className={`is-${downloadKey}`} src={download.icon} alt="" />
      <span>{download.label}</span>
    </a>
  )
}

function PlatformActions({
  platform,
  release,
  onWeChatDownload,
}) {
  if (platform === 'ios') {
    return <DownloadAction downloadKey="ios" onWeChatDownload={onWeChatDownload} />
  }

  if (platform === 'android') {
    return (
      <>
        <DownloadAction downloadKey="google" onWeChatDownload={onWeChatDownload} />
        <DownloadAction
          downloadKey="apk"
          onWeChatDownload={onWeChatDownload}
          url={release.apkUrl}
        />
      </>
    )
  }

  return (
    <>
      <DownloadAction downloadKey="ios" forceNormal onWeChatDownload={onWeChatDownload} />
      <DownloadAction downloadKey="google" forceNormal onWeChatDownload={onWeChatDownload} />
      <DownloadAction
        downloadKey="apk"
        forceNormal
        onWeChatDownload={onWeChatDownload}
        url={release.apkUrl}
      />
    </>
  )
}

function WeChatDownloadGuide({ download, platform, onClose }) {
  const closeButtonRef = useRef(null)
  const [copyStatus, setCopyStatus] = useState('idle')

  useEffect(() => {
    closeButtonRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const browserInstruction =
    platform === 'ios' ? '在 Safari 中打开/在默认浏览器中打开' : '在浏览器中打开'

  return (
    <div
      className="wechat-download-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="wechat-download-guide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wechat-download-title"
      >
        <button
          ref={closeButtonRef}
          className="wechat-download-close"
          type="button"
          aria-label="关闭"
          onClick={onClose}
        >
          ×
        </button>
        <div className="wechat-download-more" aria-hidden="true">•••</div>
        <h2 id="wechat-download-title">请在浏览器中打开</h2>
        <p>
          微信可能会拦截应用商店和安装包。点击右上角“•••”，选择“{browserInstruction}”，
          再点击下载按钮。
        </p>
        <div className="wechat-download-guide-actions">
          <a href={download.url} rel="noreferrer">
            仍然尝试打开
          </a>
          <button
            type="button"
            onClick={() => {
              setCopyStatus('copying')
              void copyText(download.url)
                .then(() => setCopyStatus('copied'))
                .catch(() => setCopyStatus('failed'))
            }}
          >
            {copyStatus === 'copied'
              ? '链接已复制'
              : copyStatus === 'failed'
                ? '复制失败，请长按链接'
                : '复制下载链接'}
          </button>
        </div>
        <p className="wechat-download-url">{download.url}</p>
      </section>
    </div>
  )
}

export default function AppDownloadPage() {
  const platform = detectDownloadPlatform()
  const inWeChat = isWeChatBrowser()
  const previewTrackRef = useRef(null)
  const [androidRelease, setAndroidRelease] = useState({
    platform: 'android',
    packageName: 'com.chriskevin.buddhachat',
    versionCode: null,
    versionName: null,
    apkUrl: DOWNLOADS.apk.url,
    sha256: null,
  })
  const [androidGuideOpen, setAndroidGuideOpen] = useState(false)
  const [blockedDownload, setBlockedDownload] = useState(null)
  useCampaignDeepLink()
  useEffect(() => {
    void fetchAndroidRelease().then(setAndroidRelease).catch(() => {})
  }, [])
  const scrollPreviews = (direction) => {
    const track = previewTrackRef.current
    if (!track) return
    const card = track.querySelector('figure')
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0
    const step = card ? card.getBoundingClientRect().width + gap : 300
    track.scrollBy({ left: direction * step, behavior: 'smooth' })
  }

  return (
    <main className="campaign-download-page">
      <section className="campaign-download-hero">
        <header className="campaign-download-header">
          <a className="campaign-download-brand" href="/" aria-label="返回 BuddhaChat 首页">
            <span>BUDDHA CHAT</span>
          </a>
          <a className="campaign-download-home-link" href="/">官方网站</a>
        </header>

        <div className="campaign-download-intro">
          <div className="campaign-download-copy">
            <h1>一念连接，<br />万法相伴</h1>

            <div className="campaign-download-primary-values">
              <article>
                <img src="/download-icons/book.png" alt="" />
                <div>
                  <h2>诸位法师的专属内容</h2>
                  <p>开示、课程与专属内容持续更新</p>
                </div>
              </article>
              <article>
                <img src="/download-icons/heart.png" alt="" />
                <div>
                  <h2>与佛祖进行心与心的沟通</h2>
                  <p>随时倾诉与请教，在对话中获得启发</p>
                </div>
              </article>
            </div>
          </div>
        </div>

        <div className="campaign-download-secondary-values">
          <article>
            <img src="/download-icons/practice.png" alt="" />
            <h2>每日修行，日日精进</h2>
            <p>禅修、持咒、诵经、每日功课与修行记录</p>
          </article>
          <article>
            <img src="/download-icons/community.png" alt="" />
            <h2>与法师及师兄零距离沟通</h2>
            <p>直接向法师请教，在社区与师兄交流共修</p>
          </article>
          <article>
            <img src="/download-icons/library.png" alt="" />
            <h2>经书、视频、佛乐，一站汇聚</h2>
            <p>4000+部免费经书、法师开示视频与冥想佛乐</p>
          </article>
        </div>

        <div
          className={`campaign-download-actions is-${platform}`}
          aria-label="下载 BuddhaChat"
          role="group"
        >
          <PlatformActions
            platform={platform}
            release={androidRelease}
            onWeChatDownload={inWeChat ? setBlockedDownload : null}
          />
          {platform !== 'ios' ? (
            <AndroidDownloadNote
              release={androidRelease}
              onOpen={() => {
                if (inWeChat) {
                  setBlockedDownload({
                    ...DOWNLOADS.apk,
                    url: androidRelease.apkUrl,
                  })
                  return
                }
                setAndroidGuideOpen(true)
              }}
            />
          ) : null}
        </div>
      </section>

      <section className="campaign-download-gallery" id="app-preview" aria-labelledby="app-preview-title">
        <div className="campaign-download-gallery-heading">
          <h2 id="app-preview-title">探索 BuddhaChat</h2>
          <div
            className="campaign-download-gallery-controls"
            aria-label="切换应用预览"
            role="group"
          >
            <button type="button" onClick={() => scrollPreviews(-1)}>上一张</button>
            <button type="button" onClick={() => scrollPreviews(1)}>下一张</button>
          </div>
        </div>
        <div className="campaign-download-gallery-track" ref={previewTrackRef} tabIndex="0">
          {PREVIEWS.map((preview) => (
            <figure key={preview.src}>
              <div className="campaign-download-preview-media">
                <div className="campaign-download-phone-screen">
                  <img
                    src={preview.src}
                    alt={preview.alt}
                    width="540"
                    height="1122"
                    decoding="async"
                    loading="lazy"
                  />
                </div>
              </div>
              <figcaption>
                <h3>{preview.title}</h3>
                <p>{preview.description}</p>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="campaign-download-gallery-hint">可左右滑动浏览，也可以使用上方按钮切换</p>
      </section>
      {blockedDownload ? (
        <WeChatDownloadGuide
          download={blockedDownload}
          platform={platform}
          onClose={() => setBlockedDownload(null)}
        />
      ) : null}
      {androidGuideOpen ? (
        <AndroidInstallGuide
          release={androidRelease}
          onClose={() => setAndroidGuideOpen(false)}
        />
      ) : null}
    </main>
  )
}
