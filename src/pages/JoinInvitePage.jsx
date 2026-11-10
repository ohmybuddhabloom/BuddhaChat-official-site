import { useMemo, useState } from 'react'
import './JoinInvitePage.css'
import { isWeChatBrowser } from '../lib/downloadPlatform.js'
import { inviteAppLink, readInviteCode } from '../lib/inviteLink.js'

// Landing page for a dojo invite: https://www.buddhachat.online/join/<code>.
// Invites used to 302 straight to buddhachat://join/<code>, which shows nothing in WeChat or a
// browser without the App. This page explains the invite, opens the App when it is installed, and
// offers the download otherwise. The App redeems the code itself (redeem_dojo_invitation).
function pickLocale(language) {
  const value = (language || '').toLowerCase()
  if (/^zh-(tw|hk|mo|hant)/.test(value)) return 'zhHant'
  if (value.startsWith('zh')) return 'zh'
  return 'en'
}

const COPY = {
  zh: {
    kicker: '道场邀请',
    title: '有人邀请你一起共修',
    body: '打开 BuddhaChat 即可加入这个道场，和同修一起念诵、打卡、交流。',
    codeLabel: '邀请码',
    open: '打开 App 加入道场',
    download: '还没安装？下载 BuddhaChat',
    copy: '复制邀请码',
    copied: '已复制',
    wechat: '微信里无法直接打开 App。请点右上角“•••”，选择“在浏览器打开”，再点“打开 App 加入道场”。',
    invalidTitle: '这个邀请链接不完整',
    invalidBody: '请让邀请你的同修重新发送一次邀请链接。',
    afterOpen: '没有反应？请先安装 BuddhaChat，装好后再回到这个页面点一次。',
  },
  zhHant: {
    kicker: '道場邀請',
    title: '有人邀請你一起共修',
    body: '打開 BuddhaChat 即可加入這個道場，和同修一起念誦、打卡、交流。',
    codeLabel: '邀請碼',
    open: '打開 App 加入道場',
    download: '還沒安裝？下載 BuddhaChat',
    copy: '複製邀請碼',
    copied: '已複製',
    wechat: '微信裡無法直接打開 App。請點右上角「•••」，選擇「在瀏覽器開啟」，再點「打開 App 加入道場」。',
    invalidTitle: '這個邀請連結不完整',
    invalidBody: '請讓邀請你的同修重新傳送一次邀請連結。',
    afterOpen: '沒有反應？請先安裝 BuddhaChat，裝好後再回到這個頁面點一次。',
  },
  en: {
    kicker: 'Dojo invitation',
    title: 'You are invited to practice together',
    body: 'Open BuddhaChat to join this dojo and chant, check in and talk with fellow practitioners.',
    codeLabel: 'Invite code',
    open: 'Open the App to join',
    download: 'Not installed yet? Download BuddhaChat',
    copy: 'Copy invite code',
    copied: 'Copied',
    wechat: 'WeChat cannot open the App directly. Tap “•••” in the upper-right corner, choose “Open in Browser”, then tap “Open the App to join”.',
    invalidTitle: 'This invite link is incomplete',
    invalidBody: 'Ask the person who invited you to send the link again.',
    afterOpen: 'Nothing happened? Install BuddhaChat first, then come back and tap again.',
  },
}

export default function JoinInvitePage({
  pathname = globalThis.location?.pathname,
  hostname = globalThis.location?.hostname,
  language = globalThis.navigator?.language,
}) {
  const code = useMemo(() => readInviteCode(pathname), [pathname])
  const copy = COPY[pickLocale(language)]
  const inWeChat = isWeChatBrowser()
  const [opened, setOpened] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    try {
      await navigator.clipboard?.writeText(code)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <main className="join-invite" data-testid="join-invite-page">
      {/* The site-wide "Open in App" pill would compete with the join button on this page. */}
      <style>{'[data-open-in-app]{display:none!important}'}</style>
      <section className="join-invite-card">
        <img className="join-invite-logo" src="/apple-touch-icon.png" alt="" width="56" height="56" />
        {code ? (
          <>
            <p className="join-invite-kicker">{copy.kicker}</p>
            <h1>{copy.title}</h1>
            <p className="join-invite-body">{copy.body}</p>
            <div className="join-invite-code">
              <span>{copy.codeLabel}</span>
              <strong data-testid="join-invite-code">{code}</strong>
              <button type="button" onClick={copyCode}>{copied ? copy.copied : copy.copy}</button>
            </div>
            {inWeChat ? (
              <p className="join-invite-wechat" role="note" data-testid="join-invite-wechat">{copy.wechat}</p>
            ) : (
              <a
                className="join-invite-open"
                href={inviteAppLink(code, hostname)}
                onClick={() => setOpened(true)}
                data-testid="join-invite-open"
              >
                {copy.open}
              </a>
            )}
            {opened && !inWeChat ? <p className="join-invite-hint">{copy.afterOpen}</p> : null}
            <a
              className="join-invite-download"
              href="/download"
              data-testid="join-invite-download"
            >
              {copy.download}
            </a>
          </>
        ) : (
          <>
            <h1>{copy.invalidTitle}</h1>
            <p className="join-invite-body" data-testid="join-invite-invalid">{copy.invalidBody}</p>
            <a className="join-invite-download" href="/download">{copy.download}</a>
          </>
        )}
      </section>
    </main>
  )
}
