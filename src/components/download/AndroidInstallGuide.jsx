import { useEffect, useRef, useState } from 'react'

import { trackCtaClick } from '../../lib/analytics.js'
import { copyText } from '../../lib/copyText.js'

const GOOGLE_PLAY_URL =
  'https://play.google.com/store/apps/details?id=com.chriskevin.buddhachat'

const INSTALL_STEPS = [
  {
    title: '浏览器提示“文件可能有害”',
    action: '确认来源属于 buddhachat.online 后，点击“仍然下载”。',
    image: '/download-guides/android-download-warning.jpg',
    alt: '一加手机浏览器显示文件可能有害提示，右下角是仍然下载按钮',
  },
  {
    title: '出现“安装信息收集提醒”',
    action: '确认安装来源后，点击“继续安装”。这是厂商对外部来源 APK 的安全确认。',
    image: '/download-guides/android-install-source-warning.jpg',
    alt: '一加手机显示安装信息收集提醒，右侧是继续安装按钮',
  },
  {
    title: '出现“敏感权限”提醒',
    action: '先查看详情。权限提示不代表已经授权，确认后点击“继续安装”。',
    image: '/download-guides/android-permission-warning.jpg',
    alt: '一加手机显示敏感权限提醒，底部左侧是继续安装按钮',
  },
]

const BRAND_PATHS = [
  {
    name: '一加 / OPPO / realme',
    path: '通常按页面依次选择“仍然下载”“继续安装”；被拦截时，在设置中搜索“安装未知应用”。',
  },
  {
    name: '小米 / Redmi',
    path: '设置 → 更多设置 → 隐私保护 → 特殊权限设置 → 安装未知应用。',
  },
  {
    name: '荣耀 / 华为',
    path: '设置 → 安全 → 更多安全设置 → 安装外部来源应用。',
  },
  {
    name: 'vivo / iQOO',
    path: '在设置中搜索“安装未知应用”或“外部来源应用”，选择当前浏览器或文件管理器。',
  },
  {
    name: '三星 Galaxy',
    path: '设置 → 安全和隐私 → 更多安全设置 → 安装未知应用。',
  },
  {
    name: 'Pixel / 其他 Android',
    path: '设置 → 应用 → 特殊应用权限 → 安装未知应用。',
  },
]

function releaseFileName(release) {
  if (!release.versionName || !release.versionCode) return 'BuddhaChat 官方 APK'
  return `BuddhaChat-${release.versionName}-${release.versionCode}.apk`
}

export function AndroidDownloadNote({ release, onOpen }) {
  return (
    <aside className="android-download-note" aria-label="安卓安装说明">
      <div>
        <strong>官网下载会出现安全确认</strong>
        <span>
          {release.versionName ? `版本 ${release.versionName}` : '官方 Android 安装包'}
          {' · '}
          官网直供 · SHA-256 可核验
        </span>
      </div>
      <button type="button" onClick={onOpen}>安装前说明</button>
    </aside>
  )
}

export default function AndroidInstallGuide({ release, onClose }) {
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

  return (
    <div
      className="android-install-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <article
        className="android-install-guide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="android-install-title"
      >
        <header className="android-install-guide-header">
          <div>
            <p>Android 官方安装包</p>
            <h2 id="android-install-title">下载前，先确认这 4 项</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="关闭安装说明"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="android-install-guide-body">
          <p className="android-install-intro">
            Android 会对从浏览器安装的 APK 增加安全确认。出现“可能有害”“未知来源”
            或“敏感权限”等提示，不等于系统已经判定 BuddhaChat 有病毒，请先核对安装包信息。
          </p>

          <dl className="android-install-verification">
            <div>
              <dt>版本</dt>
              <dd>
                {release.versionName && release.versionCode
                  ? `${release.versionName}（${release.versionCode}）`
                  : '正在获取最新版本'}
              </dd>
            </div>
            <div>
              <dt>文件名</dt>
              <dd>{releaseFileName(release)}</dd>
            </div>
            <div>
              <dt>官方来源</dt>
              <dd>buddhachat.online（文件由 music.buddhachat.online 分发）</dd>
            </div>
            <div>
              <dt>应用包名</dt>
              <dd>{release.packageName}</dd>
            </div>
            <div className="is-hash">
              <dt>SHA-256</dt>
              <dd>{release.sha256 || '正在获取校验值'}</dd>
              {release.sha256 ? (
                <button
                  type="button"
                  onClick={() => {
                    void copyText(release.sha256)
                      .then(() => setCopyStatus('copied'))
                      .catch(() => setCopyStatus('failed'))
                  }}
                >
                  {copyStatus === 'copied'
                    ? '已复制'
                    : copyStatus === 'failed'
                      ? '复制失败'
                      : '复制校验值'}
                </button>
              ) : null}
            </div>
          </dl>

          <div className="android-install-safety-note">
            <strong>什么情况下不要继续？</strong>
            <p>
              如果系统明确显示“发现病毒”或“恶意应用”，或者域名、文件名、版本与上方信息不一致，
              请取消安装。BuddhaChat 商店版本已通过 App Store 与 Google Play 审核；
              官网 APK 在发布前还会自动校验包名和官方签名。
            </p>
          </div>

          <section className="android-install-steps" aria-labelledby="android-install-steps-title">
            <div className="android-install-section-heading">
              <p>一加 / OPPO 示例</p>
              <h3 id="android-install-steps-title">安装时，按顺序这样操作</h3>
            </div>
            <div className="android-install-step-track">
              {INSTALL_STEPS.map((step, index) => (
                <figure key={step.image}>
                  <div className="android-install-step-number">{index + 1}</div>
                  <img
                    src={step.image}
                    alt={step.alt}
                    width="1080"
                    height="2354"
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption>
                    <strong>{step.title}</strong>
                    <span>{step.action}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="android-install-swipe-hint">左右滑动查看 3 个步骤</p>
          </section>

          <details className="android-install-brand-help">
            <summary>其他安卓品牌在哪里设置？</summary>
            <div>
              <p>
                不同机型的菜单名称会略有不同。优先在设置顶部搜索“安装未知应用”
                或“外部来源应用”。
              </p>
              <dl>
                {BRAND_PATHS.map((brand) => (
                  <div key={brand.name}>
                    <dt>{brand.name}</dt>
                    <dd>{brand.path}</dd>
                  </div>
                ))}
              </dl>
              <p className="android-install-brand-safety">
                只允许本次使用的浏览器或文件管理器，安装完成后建议关闭该权限。
                无需关闭 Play Protect 或整机安全扫描。
              </p>
            </div>
          </details>
        </div>
        <footer className="android-install-primary-actions">
          <a
            href={release.apkUrl}
            rel="noreferrer"
            onClick={() => trackCtaClick('app_download_apk_confirmed', 'app')}
          >
            开始下载官方 APK
          </a>
          <a href={GOOGLE_PLAY_URL} rel="noreferrer">
            改用 Google Play
          </a>
        </footer>
      </article>
    </div>
  )
}
