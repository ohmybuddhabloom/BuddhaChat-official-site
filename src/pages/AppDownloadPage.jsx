import { useEffect, useRef, useState } from 'react'

import AndroidInstallGuide, {
  AndroidDownloadConfirmation,
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
  const attemptedRef = useRef(false)
  useEffect(() => {
    const deepLink = buildCampaignDeepLink()
    if (!deepLink || attemptedRef.current) return
    attemptedRef.current = true

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
  }, [])
}

const DOWNLOADS = {
  ios: {
    icon: '/download-icons/apple-official.svg',
    url: import.meta.env.VITE_APP_STORE_URL || 'https://apps.apple.com/app/id6762049050',
  },
  google: {
    icon: '/download-icons/google-play.png',
    url:
      import.meta.env.VITE_GOOGLE_PLAY_URL ||
      'https://play.google.com/store/apps/details?id=com.chriskevin.buddhachat',
  },
  apk: {
    icon: '/download-icons/android.png',
    url: import.meta.env.VITE_ANDROID_APK_URL || '/downloads/android/latest.apk',
  },
}

const PREVIEW_IMAGES = [
  'app-ai-buddha-mobile',
  'app-home-mobile',
  'app-master-talks-mobile',
  'app-practice-mobile',
  'app-music-mobile',
  'app-scriptures-mobile',
  'app-community-mobile',
]

const PAGE_COPY = {
  zh: {
    downloadLabels: {
      ios: 'App Store 下载',
      google: 'Google Play 下载',
      apk: '安卓安装包下载',
    },
    downloadUnavailable: '下载地址配置中',
    homeAria: '返回 BuddhaChat 首页',
    officialSite: '官方网站',
    headline: ['一念连接，', '万法相伴'],
    primaryValues: [
      ['诸位法师的专属内容', '开示、课程与专属内容持续更新'],
      ['与佛祖进行心与心的沟通', '随时倾诉与请教，在对话中获得启发'],
    ],
    secondaryValues: [
      ['每日修行，日日精进', '禅修、持咒、诵经、每日功课与修行记录'],
      ['与法师及师兄零距离沟通', '直接向法师请教，在社区与师兄交流共修'],
      ['经书、视频、佛乐，一站汇聚', '4000+部免费经书、法师开示视频与冥想佛乐'],
    ],
    downloadAria: '下载 BuddhaChat',
    galleryTitle: '探索 BuddhaChat',
    galleryControlsAria: '切换应用预览',
    previous: '上一张',
    next: '下一张',
    galleryHint: '可左右滑动浏览，也可以使用上方按钮切换',
    wechat: {
      title: '请在浏览器中打开',
      close: '关闭',
      iosInstruction: '在 Safari 中打开/在默认浏览器中打开',
      browserInstruction: '在浏览器中打开',
      message: (instruction) =>
        `微信可能会拦截应用商店和安装包。点击右上角“•••”，选择“${instruction}”，再点击下载按钮。`,
      tryOpen: '仍然尝试打开',
      copy: '复制下载链接',
      copied: '链接已复制',
      copyFailed: '复制失败，请长按链接',
    },
    previews: [
      ['BuddhaChat AI 佛祖对话真实页面', 'AI 佛祖对话', '随时倾诉与请教，AI 以佛法视角回应，陪你安顿身心。'],
      ['BuddhaChat 首页真实页面', '每日法师推荐', '每日推荐法师开示与最新内容，也可切换问答，找到当下关心的佛法回应。'],
      ['BuddhaChat 法师开示真实页面', '法师开示', '源慧法师等法师的视频开示与修心内容，让心慢下来。'],
      ['BuddhaChat 每日修行真实页面', '持续修行', '禅修、木鱼、诵经与连续天数记录，把修行变成每天的习惯。'],
      ['BuddhaChat 佛乐场景真实页面', '佛乐相伴', '按静心、睡眠、专注等场景聆听佛乐，让声音陪伴禅修与日常安住。'],
      ['BuddhaChat 读经导航真实页面', 'AI 解读与读经', '海量经文可检索阅读，支持 AI 白话解读与 AI 读经，让经典更易懂、更易坚持。'],
      ['BuddhaChat 道场与共修社区真实页面', '道场共修', '找到精选道场与推荐法师，和同修一起交流精进。'],
    ],
  },
  en: {
    downloadLabels: {
      ios: 'Download on the App Store',
      google: 'Get it on Google Play',
      apk: 'Download Android APK',
    },
    downloadUnavailable: 'Download link coming soon',
    homeAria: 'Return to the BuddhaChat homepage',
    officialSite: 'Official Website',
    headline: ['One Mindful Connection,', 'Boundless Dharma by Your Side'],
    primaryValues: [
      ['Exclusive Content from Buddhist Masters', 'Dharma talks, courses, and exclusive content updated regularly'],
      ['Heart-to-Heart Conversations with Buddha', 'Share what is on your mind and find insight through conversation'],
    ],
    secondaryValues: [
      ['Practice Daily, Progress Every Day', 'Meditation, mantras, sutra recitation, daily practice, and progress tracking'],
      ['Connect Directly with Masters and Fellow Practitioners', 'Ask Buddhist masters directly and practice with the community'],
      ['Scriptures, Videos, and Buddhist Music in One Place', '4,000+ free scriptures, Dharma talks, and meditation music'],
    ],
    downloadAria: 'Download BuddhaChat',
    galleryTitle: 'Explore BuddhaChat',
    galleryControlsAria: 'Switch app previews',
    previous: 'Previous',
    next: 'Next',
    galleryHint: 'Swipe left or right, or use the buttons above to browse',
    wechat: {
      title: 'Open in Your Browser',
      close: 'Close',
      iosInstruction: 'Open in Safari / Open in Default Browser',
      browserInstruction: 'Open in Browser',
      message: (instruction) =>
        `WeChat may block app stores and installation files. Tap “•••” in the upper-right corner, choose “${instruction},” then tap the download button again.`,
      tryOpen: 'Try to Open Anyway',
      copy: 'Copy Download Link',
      copied: 'Link Copied',
      copyFailed: 'Copy Failed—Press and Hold the Link',
    },
    previews: [
      ['BuddhaChat AI Buddha conversation screen', 'AI Conversations with Buddha', 'Share what is on your mind anytime. AI responds through a Buddhist lens to help you settle body and mind.'],
      ['BuddhaChat home screen', 'Daily Master Recommendations', 'Discover daily Dharma talks and new content, or switch to Q&A for guidance on what matters now.'],
      ['BuddhaChat Dharma talks screen', 'Dharma Talks', 'Watch teachings and cultivation guidance from Master Yuanhui and other Buddhist masters, and let the mind slow down.'],
      ['BuddhaChat daily practice screen', 'Consistent Practice', 'Build a daily habit with meditation, wooden fish, sutra recitation, and practice streaks.'],
      ['BuddhaChat Buddhist music screen', 'Buddhist Music by Your Side', 'Listen by mood—calm, sleep, focus, and more—and let sound accompany meditation and daily life.'],
      ['BuddhaChat scripture reading screen', 'AI Explanations and Sutra Reading', 'Search and read a vast scripture library with plain-language AI explanations and AI narration.'],
      ['BuddhaChat practice community screen', 'Practice Community', 'Find selected practice centers and recommended masters, then learn and grow with fellow practitioners.'],
    ],
  },
}

function DownloadAction({
  copy,
  downloadKey,
  forceNormal = false,
  onBeforeDownload,
  onWeChatDownload,
  url,
}) {
  const download = {
    ...DOWNLOADS[downloadKey],
    label: copy.downloadLabels[downloadKey],
    url: url ?? DOWNLOADS[downloadKey].url,
  }
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
          <small>{copy.downloadUnavailable}</small>
        </span>
      </div>
    )
  }

  if (onBeforeDownload && !onWeChatDownload) {
    return (
      <button
        className="campaign-download-action"
        type="button"
        onClick={() => {
          trackCtaClick(`app_download_${downloadKey}`, 'app')
          onBeforeDownload()
        }}
      >
        <img className={`is-${downloadKey}`} src={download.icon} alt="" />
        <span>{download.label}</span>
      </button>
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
  copy,
  platform,
  release,
  onApkDownload,
  onWeChatDownload,
}) {
  if (platform === 'ios') {
    return (
      <DownloadAction
        copy={copy}
        downloadKey="ios"
        onWeChatDownload={onWeChatDownload}
      />
    )
  }

  if (platform === 'android') {
    return (
      <>
        <DownloadAction
          copy={copy}
          downloadKey="google"
          onWeChatDownload={onWeChatDownload}
        />
        <DownloadAction
          copy={copy}
          downloadKey="apk"
          onBeforeDownload={onApkDownload}
          onWeChatDownload={onWeChatDownload}
          url={release.apkUrl}
        />
      </>
    )
  }

  return (
    <>
      <DownloadAction
        copy={copy}
        downloadKey="ios"
        forceNormal
        onWeChatDownload={onWeChatDownload}
      />
      <DownloadAction
        copy={copy}
        downloadKey="google"
        forceNormal
        onWeChatDownload={onWeChatDownload}
      />
      <DownloadAction
        copy={copy}
        downloadKey="apk"
        forceNormal
        onBeforeDownload={onApkDownload}
        onWeChatDownload={onWeChatDownload}
        url={release.apkUrl}
      />
    </>
  )
}

function WeChatDownloadGuide({ copy, download, platform, onClose }) {
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
    platform === 'ios'
      ? copy.wechat.iosInstruction
      : copy.wechat.browserInstruction

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
          aria-label={copy.wechat.close}
          onClick={onClose}
        >
          ×
        </button>
        <div className="wechat-download-more" aria-hidden="true">•••</div>
        <h2 id="wechat-download-title">{copy.wechat.title}</h2>
        <p>{copy.wechat.message(browserInstruction)}</p>
        <div className="wechat-download-guide-actions">
          <a href={download.url} rel="noreferrer">
            {copy.wechat.tryOpen}
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
              ? copy.wechat.copied
              : copyStatus === 'failed'
                ? copy.wechat.copyFailed
                : copy.wechat.copy}
          </button>
        </div>
        <p className="wechat-download-url">{download.url}</p>
      </section>
    </div>
  )
}

export default function AppDownloadPage({ locale = 'zh' }) {
  const copy = PAGE_COPY[locale] ?? PAGE_COPY.zh
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
  const [androidDownloadConfirmOpen, setAndroidDownloadConfirmOpen] = useState(false)
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
    <main className="campaign-download-page" lang={locale === 'en' ? 'en' : 'zh-Hans'}>
      <section className="campaign-download-hero">
        <header className="campaign-download-header">
          <a className="campaign-download-brand" href="/" aria-label={copy.homeAria}>
            <span>BUDDHA CHAT</span>
          </a>
          <a className="campaign-download-home-link" href="/">{copy.officialSite}</a>
        </header>

        <div className="campaign-download-intro">
          <div className="campaign-download-copy">
            <h1>{copy.headline[0]}<br />{copy.headline[1]}</h1>

            <div className="campaign-download-primary-values">
              <article>
                <img src="/download-icons/book.png" alt="" />
                <div>
                  <h2>{copy.primaryValues[0][0]}</h2>
                  <p>{copy.primaryValues[0][1]}</p>
                </div>
              </article>
              <article>
                <img src="/download-icons/heart.png" alt="" />
                <div>
                  <h2>{copy.primaryValues[1][0]}</h2>
                  <p>{copy.primaryValues[1][1]}</p>
                </div>
              </article>
            </div>
          </div>
        </div>

        <div className="campaign-download-secondary-values">
          <article>
            <img src="/download-icons/practice.png" alt="" />
            <h2>{copy.secondaryValues[0][0]}</h2>
            <p>{copy.secondaryValues[0][1]}</p>
          </article>
          <article>
            <img src="/download-icons/community.png" alt="" />
            <h2>{copy.secondaryValues[1][0]}</h2>
            <p>{copy.secondaryValues[1][1]}</p>
          </article>
          <article>
            <img src="/download-icons/library.png" alt="" />
            <h2>{copy.secondaryValues[2][0]}</h2>
            <p>{copy.secondaryValues[2][1]}</p>
          </article>
        </div>

        <div
          className={`campaign-download-actions is-${platform}`}
          aria-label={copy.downloadAria}
          role="group"
        >
          <PlatformActions
            copy={copy}
            platform={platform}
            release={androidRelease}
            onApkDownload={() => setAndroidDownloadConfirmOpen(true)}
            onWeChatDownload={inWeChat ? setBlockedDownload : null}
          />
          {platform !== 'ios' ? (
            <AndroidDownloadNote
              locale={locale}
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
          <h2 id="app-preview-title">{copy.galleryTitle}</h2>
          <div
            className="campaign-download-gallery-controls"
            aria-label={copy.galleryControlsAria}
            role="group"
          >
            <button type="button" onClick={() => scrollPreviews(-1)}>{copy.previous}</button>
            <button type="button" onClick={() => scrollPreviews(1)}>{copy.next}</button>
          </div>
        </div>
        <div className="campaign-download-gallery-track" ref={previewTrackRef} tabIndex="0">
          {copy.previews.map((preview, index) => (
            <figure key={PREVIEW_IMAGES[index]}>
              <div className="campaign-download-preview-media">
                <div className="campaign-download-phone-screen">
                  <picture>
                    <source
                      type="image/avif"
                      srcSet={`/app-previews/${PREVIEW_IMAGES[index]}.avif`}
                    />
                    <img
                      src={`/app-previews/${PREVIEW_IMAGES[index]}.jpg`}
                      alt={preview[0]}
                      width="540"
                      height="1122"
                      decoding="async"
                      loading="lazy"
                    />
                  </picture>
                </div>
              </div>
              <figcaption>
                <h3>{preview[1]}</h3>
                <p>{preview[2]}</p>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="campaign-download-gallery-hint">{copy.galleryHint}</p>
      </section>
      {blockedDownload ? (
        <WeChatDownloadGuide
          copy={copy}
          download={blockedDownload}
          platform={platform}
          onClose={() => setBlockedDownload(null)}
        />
      ) : null}
      {androidDownloadConfirmOpen ? (
        <AndroidDownloadConfirmation
          locale={locale}
          release={androidRelease}
          onClose={() => setAndroidDownloadConfirmOpen(false)}
          onViewGuide={() => {
            setAndroidDownloadConfirmOpen(false)
            setAndroidGuideOpen(true)
          }}
        />
      ) : null}
      {androidGuideOpen ? (
        <AndroidInstallGuide
          locale={locale}
          release={androidRelease}
          onClose={() => setAndroidGuideOpen(false)}
        />
      ) : null}
    </main>
  )
}
