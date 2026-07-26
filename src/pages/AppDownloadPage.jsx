import { useRef } from 'react'

import { trackCtaClick } from '../lib/analytics.js'
import { detectDownloadPlatform } from '../lib/downloadPlatform.js'

const DOWNLOADS = {
  ios: {
    label: 'App Store 下载',
    icon: '/download-icons/apple.png',
    url: import.meta.env.VITE_APP_STORE_URL || 'https://apps.apple.com/app/id6762049050',
  },
  google: {
    label: 'Google Play 下载',
    icon: '/download-icons/google-play.png',
    url: import.meta.env.VITE_GOOGLE_PLAY_URL,
  },
  apk: {
    label: '安卓安装包',
    icon: '/download-icons/android.png',
    url: import.meta.env.VITE_ANDROID_APK_URL,
  },
}

const PREVIEWS = [
  {
    src: '/app-previews/foshuo-home.webp',
    alt: 'BuddhaChat 首页与修习内容',
    title: '每日修习',
    description: '今天该做什么，一眼就能看清。',
  },
  {
    src: '/app-previews/qa-detail.webp',
    alt: 'BuddhaChat 与佛祖对话页面',
    title: '佛祖问答',
    description: '把心里的困惑，慢慢说出来。',
  },
  {
    src: '/app-previews/master-updates.webp',
    alt: 'BuddhaChat 法师专属内容页面',
    title: '法师专属内容',
    description: '持续观看开示、课程与最新更新。',
  },
  {
    src: '/app-previews/deepin-device.webp',
    alt: 'BuddhaChat 修习设备页面',
    title: '深入修习',
    description: '把听闻、思考和练习沉淀下来。',
  },
]

function DownloadAction({ downloadKey }) {
  const download = DOWNLOADS[downloadKey]
  const isReady = Boolean(download.url)

  if (!isReady) {
    return (
      <div className="campaign-download-action is-disabled" aria-disabled="true">
        <img src={download.icon} alt="" />
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
      onClick={() => trackCtaClick(`yuanhui_download_${downloadKey}`, 'app')}
      rel="noreferrer"
    >
      <img src={download.icon} alt="" />
      <span>{download.label}</span>
    </a>
  )
}

function PlatformActions({ platform }) {
  if (platform === 'ios') {
    return <DownloadAction downloadKey="ios" />
  }

  if (platform === 'android') {
    return (
      <>
        <DownloadAction downloadKey="google" />
        <DownloadAction downloadKey="apk" />
      </>
    )
  }

  return (
    <>
      <DownloadAction downloadKey="ios" />
      <DownloadAction downloadKey="google" />
      <DownloadAction downloadKey="apk" />
    </>
  )
}

export default function AppDownloadPage() {
  const platform = detectDownloadPlatform()
  const previewTrackRef = useRef(null)
  const scrollPreviews = (direction) => {
    previewTrackRef.current?.scrollBy({ left: direction * 300, behavior: 'smooth' })
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
            <h1>静心，自在连接</h1>
            <p className="campaign-download-lead">BuddhaChat · 观看 · 对话 · 修习</p>

            <div className="campaign-download-values">
              <article>
                <img src="/download-icons/book.png" alt="" />
                <div>
                  <h2>诸位法师的专属内容</h2>
                  <p>开示、课程与持续更新</p>
                </div>
              </article>
              <article>
                <img src="/download-icons/heart.png" alt="" />
                <div>
                  <h2>与佛祖进行心与心的沟通</h2>
                  <p>随时倾诉与请教，在对话中获得启发</p>
                </div>
              </article>
              <article>
                <img src="/download-icons/book.png" alt="" />
                <div>
                  <h2>每日修行，日日精进</h2>
                  <p>禅修、持咒、诵经、每日功课与修行记录</p>
                </div>
              </article>
              <article>
                <img src="/download-icons/heart.png" alt="" />
                <div>
                  <h2>与法师及师兄零距离沟通</h2>
                  <p>直接向法师请教，在社区与师兄交流共修</p>
                </div>
              </article>
              <article>
                <img src="/download-icons/book.png" alt="" />
                <div>
                  <h2>经书、视频、佛乐，一站汇聚</h2>
                  <p>4000+部免费经书、法师开示视频与冥想佛乐</p>
                </div>
              </article>
            </div>
          </div>
        </div>

        <div
          className={`campaign-download-actions is-${platform}`}
          aria-label="下载 BuddhaChat"
        >
          <PlatformActions platform={platform} />
        </div>

        <a className="campaign-download-scroll-cue" href="#app-preview">
          继续下滑，了解 BuddhaChat
        </a>
      </section>

      <section className="campaign-download-gallery" id="app-preview" aria-labelledby="app-preview-title">
        <div className="campaign-download-gallery-heading">
          <h2 id="app-preview-title">在 BuddhaChat，你可以</h2>
          <div className="campaign-download-gallery-controls" aria-label="切换应用预览">
            <button type="button" onClick={() => scrollPreviews(-1)}>上一张</button>
            <button type="button" onClick={() => scrollPreviews(1)}>下一张</button>
          </div>
        </div>
        <div className="campaign-download-gallery-track" ref={previewTrackRef} tabIndex="0">
          {PREVIEWS.map((preview) => (
            <figure key={preview.src}>
              <div className="campaign-download-preview-media">
                <div className="campaign-download-phone-screen">
                  <img src={preview.src} alt={preview.alt} />
                </div>
              </div>
              <figcaption>
                <h3>{preview.title}</h3>
                <p>{preview.description}</p>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="campaign-download-gallery-hint">手指左右滑动，也可以使用上方按钮切换</p>
      </section>
    </main>
  )
}
