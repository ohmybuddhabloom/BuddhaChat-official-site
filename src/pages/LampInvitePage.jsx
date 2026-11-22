import { useMemo, useState } from 'react'
import './LampInvitePage.css'
import { detectDownloadPlatform, isWeChatBrowser } from '../lib/downloadPlatform.js'
import { lampLinks, readLampCity, readLampCode } from '../lib/lampLink.js'

// 传灯 (Owner 2026-11-22, direction 信笺 colours with 晨光's fuller copy): a friend sent a teaching
// from the App. The page reads like a letter: who lit the lamp (only the city, never a name), one
// teaching, then the download that carries the sharer's invite code into the App.
function pickLocale(language) {
  const value = (language || '').toLowerCase()
  if (/^zh-(tw|hk|mo|hant)/.test(value)) return 'zhHant'
  if (value.startsWith('zh')) return 'zh'
  return 'en'
}

const COPY = {
  zh: {
    letter: (city) => (city ? `${city}的来信` : '一封来信'),
    title: (city) => (city ? `一位在${city}的师兄，为你点亮了一盏灯` : '一位师兄，为你点亮了一盏灯'),
    quote: ['诸恶莫作，众善奉行，', '自净其意，是诸佛教。'],
    source: '《法句经》',
    body: '千余位法师的开示，以十二种语言流布十方，分文不取。',
    download: '下载 BuddhaChat，接过这盏灯',
    apk: '无法使用 Google Play？下载安卓安装包',
    apkPrimary: '下载安卓安装包，接过这盏灯',
    open: '已安装？在 App 中打开',
    note: '打开 App 后，这盏灯会记在你们二人名下',
    codeLabel: '传灯码',
    copy: '复制',
    copied: '已复制',
    codeHint: '若装好后没有自动记上，可在「我的 › 支持我们 › 输入好友的邀请码」填写。',
    wechat: '微信里不能直接下载或打开 App。请点右上角“•••”，选择“在浏览器打开”。',
    moreTitle: '在 App 里还可以',
    more: [['听开示', '千余位法师，十二种语言'], ['问佛', '心里有事，随时请法'], ['读经', '经典原文与白话'], ['修行', '打坐、念佛、每日功课']],
    moreLink: '了解 BuddhaChat，查看更多 ›',
    invalidTitle: '这盏灯的链接不完整',
    invalidBody: '请让分享给你的师兄重新发送一次。',
    linkCopied: '传灯码已复制，正在前往下载…',
  },
  zhHant: {
    letter: (city) => (city ? `${city}的來信` : '一封來信'),
    title: (city) => (city ? `一位在${city}的師兄，為你點亮了一盞燈` : '一位師兄，為你點亮了一盞燈'),
    quote: ['諸惡莫作，眾善奉行，', '自淨其意，是諸佛教。'],
    source: '《法句經》',
    body: '千餘位法師的開示，以十二種語言流布十方，分文不取。',
    download: '下載 BuddhaChat，接過這盞燈',
    apk: '無法使用 Google Play？下載 Android 安裝檔',
    apkPrimary: '下載 Android 安裝檔，接過這盞燈',
    open: '已安裝？在 App 中打開',
    note: '打開 App 後，這盞燈會記在你們二人名下',
    codeLabel: '傳燈碼',
    copy: '複製',
    copied: '已複製',
    codeHint: '若裝好後沒有自動記上，可在「我的 › 支持我們 › 輸入好友的邀請碼」填寫。',
    wechat: '微信裡不能直接下載或打開 App。請點右上角「•••」，選擇「在瀏覽器開啟」。',
    moreTitle: '在 App 裡還可以',
    more: [['聽開示', '千餘位法師，十二種語言'], ['問佛', '心裡有事，隨時請法'], ['讀經', '經典原文與白話'], ['修行', '打坐、念佛、每日功課']],
    moreLink: '了解 BuddhaChat，查看更多 ›',
    invalidTitle: '這盞燈的連結不完整',
    invalidBody: '請讓分享給你的師兄重新傳送一次。',
    linkCopied: '傳燈碼已複製，正在前往下載…',
  },
  en: {
    letter: (city) => (city ? `A letter from ${city}` : 'A letter for you'),
    title: (city) => (city ? `A fellow practitioner in ${city} lit a lamp for you` : 'A fellow practitioner lit a lamp for you'),
    quote: ['Do no evil, do all good,', 'purify the mind: this is the teaching of all Buddhas.'],
    source: 'Dhammapada',
    body: 'Teachings from 1000+ masters, in 12 languages, all free.',
    download: 'Download BuddhaChat and receive the lamp',
    apk: 'No Google Play? Download the Android package',
    apkPrimary: 'Download the Android package and receive the lamp',
    open: 'Already installed? Open in the App',
    note: 'Once you open the App, this lamp is kept in both your names',
    codeLabel: 'Lamp code',
    copy: 'Copy',
    copied: 'Copied',
    codeHint: 'If it is not picked up after installing, enter it under Me › Support Us › Enter a friend’s invite code.',
    wechat: 'WeChat cannot download or open the App directly. Tap “•••” in the upper-right corner and choose “Open in Browser”.',
    moreTitle: 'In the App you can also',
    more: [['Listen', '1000+ masters in 12 languages'], ['Ask', 'Bring what is on your mind'], ['Read', 'Sutras with plain explanations'], ['Practise', 'Meditation, chanting, daily practice']],
    moreLink: 'Learn more about BuddhaChat ›',
    invalidTitle: 'This lamp link is incomplete',
    invalidBody: 'Ask the friend who shared it to send it again.',
    linkCopied: 'Lamp code copied, opening the download…',
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

export default function LampInvitePage({
  pathname = globalThis.location?.pathname,
  search = globalThis.location?.search,
  hostname = globalThis.location?.hostname,
  language = globalThis.navigator?.language,
}) {
  const code = useMemo(() => readLampCode(pathname), [pathname])
  const city = useMemo(() => readLampCity(search), [search])
  const links = useMemo(() => (code ? lampLinks(code, hostname) : null), [code, hostname])
  const copy = COPY[pickLocale(language)]
  const platform = detectDownloadPlatform()
  const inWeChat = isWeChatBrowser()
  const [codeCopied, setCodeCopied] = useState(false)
  const [leaving, setLeaving] = useState(false)

  // iOS has no install referrer: record the page on the tap, the first launch claims it.
  const recordForIos = () => {
    if (!links) return
    const body = new Blob([JSON.stringify({ action: 'record', url: links.target })], { type: 'text/plain' })
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
      if (ok) setLeaving(true)
      leave()
    }, leave)
    setTimeout(leave, 800)
  }

  const copyCode = () => {
    copyText(code).then((ok) => setCodeCopied(ok))
  }

  if (!code || !links) {
    return (
      <main className="lamp-page" data-testid="lamp-page">
        <section className="lamp-letter lamp-letter--plain">
          <h1>{copy.invalidTitle}</h1>
          <p className="lamp-body" data-testid="lamp-invalid">{copy.invalidBody}</p>
          <a className="lamp-cta" href="/download">{copy.download}</a>
        </section>
      </main>
    )
  }

  let downloads
  if (platform === 'ios') {
    downloads = [
      <a key="ios" className="lamp-cta" href={links.appStoreUrl ?? links.downloadUrl} onClick={recordForIos} data-testid="lamp-download">
        {copy.download}
      </a>,
    ]
  } else if (platform === 'android' && links.googlePlayUrl) {
    downloads = [
      <a key="play" className="lamp-cta" href={links.googlePlayUrl} onClick={copyThenGo(links.googlePlayUrl)} data-testid="lamp-download">{copy.download}</a>,
      <a key="apk" className="lamp-text" href={links.apkUrl} onClick={copyThenGo(links.apkUrl)} data-testid="lamp-apk">{copy.apk}</a>,
    ]
  } else if (platform === 'android') {
    downloads = [
      <a key="apk" className="lamp-cta" href={links.apkUrl} onClick={copyThenGo(links.apkUrl)} data-testid="lamp-download">{copy.apkPrimary}</a>,
    ]
  } else {
    downloads = [<a key="web" className="lamp-cta" href={links.downloadUrl} data-testid="lamp-download">{copy.download}</a>]
  }

  return (
    <main className="lamp-page" data-testid="lamp-page">
      {/* The site-wide "Open in App" pill would compete with this page's own buttons. */}
      <style>{'[data-open-in-app]{display:none!important}'}</style>
      {inWeChat ? (
        <div className="lamp-wechat" role="note" data-testid="lamp-wechat">
          <span aria-hidden="true">↗</span>
          {copy.wechat}
        </div>
      ) : null}
      <section className="lamp-letter">
        <p className="lamp-from">{copy.letter(city)}</p>
        <h1 data-testid="lamp-title">{copy.title(city)}</h1>
        <blockquote className="lamp-quote">
          {copy.quote.map((line) => <span key={line}>{line}</span>)}
        </blockquote>
        <p className="lamp-source">— {copy.source}</p>
      </section>
      <section className="lamp-actions">
        <p className="lamp-body">{copy.body}</p>
        {downloads}
        {inWeChat ? null : (
          <a className="lamp-open" href={links.appUrl} data-testid="lamp-open">{copy.open}</a>
        )}
        <p className="lamp-note">{copy.note}</p>
        {leaving ? <p className="lamp-notice" role="status">{copy.linkCopied}</p> : null}
        <div className="lamp-code">
          <span>{copy.codeLabel}</span>
          <strong data-testid="lamp-code">{code}</strong>
          <button type="button" onClick={copyCode}>{codeCopied ? copy.copied : copy.copy}</button>
        </div>
        <p className="lamp-code-hint">{copy.codeHint}</p>
      </section>
      <section className="lamp-more" aria-label={copy.moreTitle}>
        <h2>{copy.moreTitle}</h2>
        <div className="lamp-grid">
          {copy.more.map(([title, body]) => (
            <div key={title}><b>{title}</b>{body}</div>
          ))}
        </div>
        <a className="lamp-more-link" href="/">{copy.moreLink}</a>
      </section>
    </main>
  )
}
