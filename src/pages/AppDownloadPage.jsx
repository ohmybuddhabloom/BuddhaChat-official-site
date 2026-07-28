import { useRef } from 'react'

import { trackCtaClick } from '../lib/analytics.js'
import { detectDownloadPlatform } from '../lib/downloadPlatform.js'

const DOWNLOADS = {
  ios: {
    label: 'App Store 下载',
    icon: '/download-icons/apple-official.svg',
    url: import.meta.env.VITE_APP_STORE_URL || 'https://apps.apple.com/app/id6762049050',
  },
  google: {
    label: 'Google Play 下载',
    icon: '/download-icons/google-play.png',
    url: import.meta.env.VITE_GOOGLE_PLAY_URL,
  },
  apk: {
    label: '安卓安装包下载',
    icon: '/download-icons/android.png',
    url: import.meta.env.VITE_ANDROID_APK_URL,
  },
}

const PREVIEWS = [
  {
    src: '/app-previews/app-ai-buddha-mobile.jpg',
    alt: 'BuddhaChat AI 佛祖对话真实页面',
    title: 'AI 佛祖对话',
    description: '随时倾诉与请教，AI 以佛法视角回应，陪你安顿身心。',
  },
  {
    src: '/app-previews/app-home-mobile.jpg',
    alt: 'BuddhaChat 首页真实页面',
    title: '每日法师推荐',
    description: '每日推荐法师开示与最新内容，也可切换问答，找到当下关心的佛法回应。',
  },
  {
    src: '/app-previews/app-master-talks-mobile.jpg',
    alt: 'BuddhaChat 法师开示真实页面',
    title: '法师开示',
    description: '源慧法师等法师的视频开示与修心内容，让心慢下来。',
  },
  {
    src: '/app-previews/app-practice-mobile.jpg',
    alt: 'BuddhaChat 每日修行真实页面',
    title: '持续修行',
    description: '禅修、木鱼、诵经与连续天数记录，把修行变成每天的习惯。',
  },
  {
    src: '/app-previews/app-music-mobile.jpg',
    alt: 'BuddhaChat 佛乐场景真实页面',
    title: '佛乐相伴',
    description: '按静心、睡眠、专注等场景聆听佛乐，让声音陪伴禅修与日常安住。',
  },
  {
    src: '/app-previews/app-scriptures-mobile.jpg',
    alt: 'BuddhaChat 读经导航真实页面',
    title: 'AI 解读与读经',
    description: '海量经文可检索阅读，支持 AI 白话解读与 AI 读经，让经典更易懂、更易坚持。',
  },
  {
    src: '/app-previews/app-community-mobile.jpg',
    alt: 'BuddhaChat 道场与共修社区真实页面',
    title: '道场共修',
    description: '找到精选道场与推荐法师，和同修一起交流精进。',
  },
]

function DownloadAction({ downloadKey, forceNormal = false }) {
  const download = DOWNLOADS[downloadKey]
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
      onClick={() => trackCtaClick(`app_download_${downloadKey}`, 'app')}
      rel="noreferrer"
    >
      <img className={`is-${downloadKey}`} src={download.icon} alt="" />
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
      <DownloadAction downloadKey="ios" forceNormal />
      <DownloadAction downloadKey="google" forceNormal />
      <DownloadAction downloadKey="apk" forceNormal />
    </>
  )
}

export default function AppDownloadPage() {
  const platform = detectDownloadPlatform()
  const previewTrackRef = useRef(null)
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
          <PlatformActions platform={platform} />
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
                  <img src={preview.src} alt={preview.alt} decoding="async" loading="lazy" />
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
    </main>
  )
}
