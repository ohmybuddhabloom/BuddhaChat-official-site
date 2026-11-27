import { useEffect, useMemo, useRef, useState } from 'react'
import './SharePage.css'
import { detectDownloadPlatform, isWeChatBrowser } from '../lib/downloadPlatform.js'
import { appShareMessage, previewBlockCount, videoGuideDelaySec } from '../lib/sharePage.js'

// 1.4.5 任务8: the page a shared video, question or article opens on. The content itself sits in the
// middle of the first screen; the App is offered gently (Owner 11-27: no hard wall), and the page can be
// passed on from any chat app, so a forward in WeChat or WhatsApp keeps travelling.

function pickLocale(preferred, language) {
  if (preferred === 'zh-Hant') return 'zhHant'
  if (preferred === 'en') return 'en'
  if (preferred === 'zh-Hans') return 'zh'
  const value = (language || '').toLowerCase()
  if (/^zh-(tw|hk|mo|hant)/.test(value)) return 'zhHant'
  if (value.startsWith('zh')) return 'zh'
  return 'en'
}

const COPY = {
  zh: {
    kind: { video: '法师开示', qa: '法师答疑', yuanhui: '源慧法师 · 开示', music: '佛乐', cangjing: '藏经阁' },
    question: '提问', answer: '法师回答',
    download: '下载 BuddhaChat', apk: '无法使用 Google Play？下载安卓安装包', apkPrimary: '下载安卓安装包',
    open: '在 App 中打开', share: '分享给朋友', copied: '链接已复制，可以粘贴给朋友',
    readAll: '在 App 读全文，还能听朗读', keepReading: '继续在网页读',
    listenInApp: '在 App 里听整张专辑，可定时、可后台播放',
    watchInApp: '在 App 里接着看，还有更多开示', later: '稍后',
    coverHint: '这段开示需要在 App 里观看',
    wechat: '微信里不能直接下载或打开 App。请点右上角“•••”，选择“在浏览器打开”。',
    wechatShare: '点右上角“•••”，可以发送给朋友或分享到朋友圈',
    moreTitle: '在 App 里还可以',
    more: [['听开示', '千余位法师，十二种语言'], ['问佛', '心里有事，随时请法'], ['读经', '经典原文与白话'], ['修行', '打坐、念佛、每日功课']],
    moreLink: '了解 BuddhaChat ›',
    leaving: '正在前往下载…',
    missingTitle: '这条内容已经不在了', missingBody: '可能已被作者删除。BuddhaChat 里还有更多开示。',
    unavailableTitle: '内容暂时打不开', unavailableBody: '请稍后再试，或在 App 里查看。',
  },
  zhHant: {
    kind: { video: '法師開示', qa: '法師答疑', yuanhui: '源慧法師 · 開示', music: '佛樂', cangjing: '藏經閣' },
    question: '提問', answer: '法師回答',
    download: '下載 BuddhaChat', apk: '無法使用 Google Play？下載 Android 安裝檔', apkPrimary: '下載 Android 安裝檔',
    open: '在 App 中打開', share: '分享給朋友', copied: '連結已複製，可以貼給朋友',
    readAll: '在 App 讀全文，還能聽朗讀', keepReading: '繼續在網頁讀',
    listenInApp: '在 App 裡聽整張專輯，可定時、可背景播放',
    watchInApp: '在 App 裡接著看，還有更多開示', later: '稍後',
    coverHint: '這段開示需要在 App 裡觀看',
    wechat: '微信裡不能直接下載或打開 App。請點右上角「•••」，選擇「在瀏覽器開啟」。',
    wechatShare: '點右上角「•••」，可以傳送給朋友或分享到朋友圈',
    moreTitle: '在 App 裡還可以',
    more: [['聽開示', '千餘位法師，十二種語言'], ['問佛', '心裡有事，隨時請法'], ['讀經', '經典原文與白話'], ['修行', '打坐、念佛、每日功課']],
    moreLink: '了解 BuddhaChat ›',
    leaving: '正在前往下載…',
    missingTitle: '這條內容已經不在了', missingBody: '可能已被作者刪除。BuddhaChat 裡還有更多開示。',
    unavailableTitle: '內容暫時打不開', unavailableBody: '請稍後再試，或在 App 裡查看。',
  },
  en: {
    kind: { video: 'Dharma talk', qa: 'A master answers', yuanhui: 'Master Yuanhui · Teaching', music: 'Buddhist music', cangjing: 'Buddhist culture' },
    question: 'Question', answer: 'The master answers',
    download: 'Download BuddhaChat', apk: 'No Google Play? Download the Android package', apkPrimary: 'Download the Android package',
    open: 'Open in the App', share: 'Share with a friend', copied: 'Link copied. Paste it to a friend.',
    readAll: 'Read it all in the App, with narration', keepReading: 'Keep reading here',
    listenInApp: 'Listen to the whole album in the App, with a sleep timer and background play',
    watchInApp: 'Keep watching in the App, with many more talks', later: 'Later',
    coverHint: 'This talk plays in the App',
    wechat: 'WeChat cannot download or open the App directly. Tap “•••” in the upper-right corner and choose “Open in Browser”.',
    wechatShare: 'Tap “•••” in the upper-right corner to send it to a friend or post it to Moments',
    moreTitle: 'In the App you can also',
    more: [['Listen', '1000+ masters in 12 languages'], ['Ask', 'Bring what is on your mind'], ['Read', 'Sutras with plain explanations'], ['Practise', 'Meditation, chanting, daily practice']],
    moreLink: 'Learn more about BuddhaChat ›',
    leaving: 'Opening the download…',
    missingTitle: 'This is no longer here', missingBody: 'It may have been removed. There is much more in BuddhaChat.',
    unavailableTitle: 'This cannot open right now', unavailableBody: 'Please try again later, or open it in the App.',
  },
}

function legacyCopy(text) {
  const field = document.createElement('textarea')
  field.value = text
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.appendChild(field)
  field.select()
  let copied = false
  try {
    copied = document.execCommand('copy')
  } catch {
    copied = false
  }
  field.remove()
  return copied
}

function copyText(text) {
  const clipboard = globalThis.navigator?.clipboard
  if (clipboard?.writeText) return clipboard.writeText(text).then(() => true, () => legacyCopy(text))
  return Promise.resolve(legacyCopy(text))
}

export default function SharePage({
  data = globalThis.__BC_SHARE__,
  language = globalThis.navigator?.language,
}) {
  const copy = COPY[pickLocale(data?.params?.l, language)]
  const links = data?.links
  const platform = detectDownloadPlatform()
  // Inside the App's own web view (a 1.4.4 App opening a share link) the App is already here.
  const appBridge = globalThis.ReactNativeWebView
  const inApp = typeof appBridge?.postMessage === 'function'
  const inWeChat = !inApp && isWeChatBrowser()
  const [expanded, setExpanded] = useState(false)
  const [guide, setGuide] = useState(false)
  const [guideDismissed, setGuideDismissed] = useState(false)
  const [notice, setNotice] = useState('')
  // In WeChat nothing can download or open the App, so every such tap explains the browser hand-off.
  const [wechatGuide, setWechatGuide] = useState(null)
  const watched = useRef(0)

  const blocks = useMemo(() => (Array.isArray(data?.blocks) ? data.blocks : []), [data])
  const isArticle = data?.type === 'yuanhui' || data?.type === 'cangjing'
  const shown = isArticle && !expanded && !inApp ? blocks.slice(0, previewBlockCount(blocks.length)) : blocks
  const truncated = shown.length < blocks.length

  // Count only the seconds the page is actually in front of the reader.
  useEffect(() => {
    if (data?.media?.kind !== 'video' || guideDismissed || inApp) return undefined
    const limit = videoGuideDelaySec(data.media.durationSec)
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      watched.current += 1
      if (watched.current >= limit) {
        setGuide(true)
        clearInterval(timer)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [data, guideDismissed, inApp])

  if (!data || !links || data.state !== 'ready') {
    const missing = data?.state === 'missing'
    return (
      <main className="share-page" data-testid="share-page">
        <style>{'[data-open-in-app]{display:none!important}'}</style>
        {inWeChat ? (
          <div className="share-wechat" role="note" data-testid="share-wechat">
            <span aria-hidden="true">↗</span>
            {copy.wechat}
          </div>
        ) : null}
        <section className="share-sheet share-sheet--plain">
          <h1>{missing ? copy.missingTitle : copy.unavailableTitle}</h1>
          <p className="share-summary" data-testid="share-state">{missing ? copy.missingBody : copy.unavailableBody}</p>
          {inWeChat || inApp ? null : <a className="share-cta" href={links?.downloadUrl ?? '/download'}>{copy.download}</a>}
          {links?.appUrl && !inWeChat && !inApp ? <a className="share-open" href={links.appUrl}>{copy.open}</a> : null}
        </section>
      </main>
    )
  }

  // iOS has no install referrer: record the page on the tap, the first launch claims it.
  const recordForIos = () => {
    const body = new Blob([JSON.stringify({ action: 'record', url: links.page })], { type: 'text/plain' })
    if (!navigator.sendBeacon?.(links.deferredLinkUrl, body)) {
      fetch(links.deferredLinkUrl, { method: 'POST', body, keepalive: true, mode: 'no-cors' }).catch(() => {})
    }
  }
  // Android: the page link goes on the clipboard inside the tap, then the download starts.
  const copyThenGo = (href) => (event) => {
    event.preventDefault()
    let settled = false
    const leave = () => {
      if (!settled) {
        settled = true
        globalThis.location.href = href
      }
    }
    copyText(links.link).then((ok) => {
      if (ok) setNotice(copy.leaving)
      leave()
    }, leave)
    setTimeout(leave, 800)
  }

  const reshare = () => {
    if (inApp) {
      appBridge.postMessage(appShareMessage(data.title, links.reshare))
      return
    }
    if (inWeChat) {
      setWechatGuide('share')
      return
    }
    const payload = { title: data.title, text: data.summary, url: links.reshare }
    if (navigator.share) {
      navigator.share(payload).catch(() => {})
      return
    }
    copyText(links.reshare).then((ok) => ok && setNotice(copy.copied))
  }

  const toBrowser = (event) => {
    event.preventDefault()
    setWechatGuide('browser')
  }

  let downloads
  if (inWeChat) {
    downloads = [<a key="wechat" className="share-cta" href={links.downloadUrl} onClick={toBrowser} data-testid="share-download">{copy.download}</a>]
  } else if (platform === 'ios') {
    downloads = [<a key="ios" className="share-cta" href={links.appStoreUrl ?? links.downloadUrl} onClick={recordForIos} data-testid="share-download">{copy.download}</a>]
  } else if (platform === 'android' && links.googlePlayUrl) {
    downloads = [
      <a key="play" className="share-cta" href={links.googlePlayUrl} onClick={copyThenGo(links.googlePlayUrl)} data-testid="share-download">{copy.download}</a>,
      <a key="apk" className="share-text" href={links.apkUrl} onClick={copyThenGo(links.apkUrl)} data-testid="share-apk">{copy.apk}</a>,
    ]
  } else if (platform === 'android') {
    downloads = [<a key="apk" className="share-cta" href={links.apkUrl} onClick={copyThenGo(links.apkUrl)} data-testid="share-download">{copy.apkPrimary}</a>]
  } else {
    downloads = [<a key="web" className="share-cta" href={links.downloadUrl} data-testid="share-download">{copy.download}</a>]
  }

  return (
    <main className="share-page" data-testid="share-page" data-share-type={data.type}>
      {/* The site-wide "Open in App" pill would compete with this page's own buttons. */}
      <style>{'[data-open-in-app]{display:none!important}'}</style>
      {inWeChat ? (
        <div className="share-wechat" role="note" data-testid="share-wechat">
          <span aria-hidden="true">↗</span>
          {copy.wechat}
        </div>
      ) : null}

      <article className="share-sheet">
        <p className="share-kind">BuddhaChat · {copy.kind[data.type] ?? ''}</p>
        <h1 data-testid="share-title">{data.title}</h1>
        {data.author ? <p className="share-author">{data.author}</p> : null}

        {data.media?.kind === 'video' ? (
          <div className="share-media">
            <iframe
              src={data.media.embedUrl}
              title={data.title}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              loading="eager"
              data-testid="share-video"
            />
          </div>
        ) : null}
        {data.media?.kind === 'cover' ? (
          <a className="share-cover" href={inApp ? undefined : inWeChat ? links.downloadUrl : links.appUrl} onClick={inWeChat ? toBrowser : undefined} data-testid="share-cover">
            <img src={links.cardUrl} alt="" />
            {inApp ? null : <span>{copy.coverHint}</span>}
          </a>
        ) : null}

        {data.media?.kind === 'audio' ? (
          <div className="share-audio">
            {links.cardUrl ? <img src={links.cardUrl} alt="" /> : null}
            <audio controls preload="none" src={data.media.audioUrl} data-testid="share-audio" />
            {inApp ? null : (
              <a className="share-text" href={inWeChat ? links.downloadUrl : links.appUrl} onClick={inWeChat ? toBrowser : undefined}>{copy.listenInApp}</a>
            )}
          </div>
        ) : null}

        {data.type === 'qa' ? (
          <div className="share-qa">
            {blocks.map((block, index) => (
              <section key={index} className={`share-qa-${block.type}`}>
                <h2>{block.type === 'answer' ? copy.answer : copy.question}</h2>
                <p>{block.text}</p>
                {block.author ? <p className="share-author">— {block.author}</p> : null}
              </section>
            ))}
          </div>
        ) : null}

        {isArticle ? (
          <div className={`share-body${truncated ? ' share-body--faded' : ''}`} data-testid="share-body">
            {shown.map((block, index) => {
              if (block.type === 'heading') return <h2 key={index}>{block.text}</h2>
              if (block.type === 'quote') return <blockquote key={index}>{block.text}</blockquote>
              return <p key={index}>{block.text}</p>
            })}
          </div>
        ) : null}
        {truncated ? (
          <div className="share-guide" data-testid="share-guide">
            <a className="share-cta" href={inWeChat ? links.downloadUrl : links.appUrl} onClick={inWeChat ? toBrowser : undefined}>{copy.readAll}</a>
            <button type="button" className="share-text" onClick={() => setExpanded(true)} data-testid="share-expand">{copy.keepReading}</button>
          </div>
        ) : null}
        {data.type === 'video' && data.summary && data.summary !== data.title ? <p className="share-summary">{data.summary}</p> : null}
      </article>

      <section className="share-actions">
        {inApp ? null : downloads}
        {inWeChat || inApp ? null : <a className="share-open" href={links.appUrl} data-testid="share-open">{copy.open}</a>}
        <button type="button" className="share-reshare" onClick={reshare} data-testid="share-reshare">{copy.share}</button>
        {notice ? <p className="share-notice" role="status">{notice}</p> : null}
      </section>

      {inApp ? null : (
        <section className="share-more" aria-label={copy.moreTitle}>
          <h2>{copy.moreTitle}</h2>
          <div className="share-grid">
            {copy.more.map(([title, body]) => <div key={title}><b>{title}</b>{body}</div>)}
          </div>
          <a className="share-more-link" href="/">{copy.moreLink}</a>
        </section>
      )}

      {guide && !guideDismissed ? (
        <div className="share-sheet-guide" role="dialog" data-testid="share-video-guide">
          <p>{copy.watchInApp}</p>
          <a className="share-cta" href={inWeChat ? links.downloadUrl : links.appUrl} onClick={inWeChat ? toBrowser : undefined}>{copy.open}</a>
          <button type="button" className="share-text" onClick={() => setGuideDismissed(true)}>{copy.later}</button>
        </div>
      ) : null}

      {wechatGuide ? (
        <button type="button" className="share-wechat-overlay" onClick={() => setWechatGuide(null)} data-testid="share-wechat-overlay">
          <span className="share-arrow" aria-hidden="true">↗</span>
          <span>{wechatGuide === 'share' ? copy.wechatShare : copy.wechat}</span>
        </button>
      ) : null}
    </main>
  )
}
