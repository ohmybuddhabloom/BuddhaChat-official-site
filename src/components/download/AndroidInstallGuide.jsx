import { useEffect, useRef, useState } from 'react'

import { trackCtaClick } from '../../lib/analytics.js'
import { copyText } from '../../lib/copyText.js'

const GOOGLE_PLAY_URL =
  'https://play.google.com/store/apps/details?id=com.chriskevin.buddhachat'

let traditionalConverterPromise = null

function loadTraditionalConverter() {
  if (!traditionalConverterPromise) {
    traditionalConverterPromise = import('opencc-js/cn2t').then((mod) =>
      mod.Converter({ from: 'cn', to: 't' }),
    ).catch((error) => {
      traditionalConverterPromise = null
      throw error
    })
  }
  return traditionalConverterPromise
}

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
        <strong>直接下载安装包会出现安全确认</strong>
        <span>
          {release.versionName ? `版本 ${release.versionName}` : '官方 Android 安装包'}
          {' · '}
          官网直供 · 安装步骤可查看
        </span>
      </div>
      <button type="button" onClick={onOpen}>安装前说明</button>
    </aside>
  )
}

export default function AndroidInstallGuide({ release, onClose }) {
  const closeButtonRef = useRef(null)
  const [copyStatus, setCopyStatus] = useState('idle')
  const [variant, setVariant] = useState('hans')
  const [traditionalConverter, setTraditionalConverter] = useState(null)
  const [languageLoading, setLanguageLoading] = useState(false)
  const text =
    variant === 'hant' && traditionalConverter
      ? traditionalConverter
      : (value) => value

  const selectVariant = (nextVariant) => {
    if (nextVariant === 'hans') {
      setVariant('hans')
      return
    }
    if (traditionalConverter) {
      setVariant('hant')
      return
    }

    setLanguageLoading(true)
    void loadTraditionalConverter()
      .then((converter) => {
        setTraditionalConverter(() => converter)
        setVariant('hant')
      })
      .catch(() => {})
      .finally(() => setLanguageLoading(false))
  }

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
        data-no-convert
        lang={variant === 'hant' ? 'zh-Hant' : 'zh-Hans'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="android-install-title"
      >
        <header className="android-install-guide-header">
          <div>
            <p>{text('Android 官方安装包')}</p>
            <h2 id="android-install-title">{text('下载前，先确认这 4 项')}</h2>
          </div>
          <div className="android-install-guide-controls">
            <div
              className="android-install-language-toggle"
              role="group"
              aria-label={text('安装说明语言')}
            >
              <button
                type="button"
                className={variant === 'hans' ? 'is-active' : ''}
                aria-pressed={variant === 'hans'}
                onClick={() => selectVariant('hans')}
              >
                简
              </button>
              <button
                type="button"
                className={variant === 'hant' ? 'is-active' : ''}
                aria-pressed={variant === 'hant'}
                disabled={languageLoading}
                onClick={() => selectVariant('hant')}
              >
                繁
              </button>
            </div>
            <button
              ref={closeButtonRef}
              className="android-install-guide-close"
              type="button"
              aria-label={text('关闭安装说明')}
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </header>

        <div className="android-install-guide-body">
          <p className="android-install-intro">
            {text(
              'Android 会对从浏览器安装的 APK 增加安全确认。出现“可能有害”“未知来源”'
              + '或“敏感权限”等提示，不等于系统已经判定 BuddhaChat 有病毒，请先核对安装包信息。',
            )}
          </p>

          <dl className="android-install-verification">
            <div>
              <dt>{text('版本')}</dt>
              <dd>
                {release.versionName && release.versionCode
                  ? `${release.versionName}（${release.versionCode}）`
                  : text('正在获取最新版本')}
              </dd>
            </div>
            <div>
              <dt>{text('文件名')}</dt>
              <dd>{text(releaseFileName(release))}</dd>
            </div>
            <div>
              <dt>{text('官方来源')}</dt>
              <dd>{text('BuddhaChat 官方服务器（buddhachat.online）')}</dd>
            </div>
            <div>
              <dt>{text('应用包名')}</dt>
              <dd>{release.packageName}</dd>
            </div>
          </dl>

          <details className="android-install-hash-help">
            <summary>{text('高级校验（可选）')}</summary>
            <div>
              <p>
                {text(
                  'SHA-256 是安装包的数字指纹。普通用户无需操作；如需核验，'
                  + '请用支持 SHA-256 的文件校验工具计算下载文件，并与下方数值逐字比较。',
                )}
              </p>
              <div className="android-install-hash-value">
                <span>SHA-256</span>
                <code>{release.sha256 || text('正在获取校验值')}</code>
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
                      ? text('已复制')
                      : copyStatus === 'failed'
                        ? text('复制失败')
                        : text('复制校验值')}
                  </button>
                ) : null}
              </div>
              <p>
                {text('两者完全一致，表示下载文件与官网发布的安装包内容一致。')}
              </p>
            </div>
          </details>

          <div className="android-install-safety-note">
            <strong>{text('什么情况下不要继续？')}</strong>
            <p>
              {text(
                '如果系统明确显示“发现病毒”或“恶意应用”，或者域名、文件名、版本与上方信息不一致，'
                + '请取消安装。',
              )}
              <span className="android-install-store-verification">
                {text(
                  'BuddhaChat 商店版已通过 App Store 与 Google Play 官方验证。',
                )}
              </span>
              {text('官网 APK 在发布前还会自动校验包名和官方签名。')}
            </p>
          </div>

          <section className="android-install-steps" aria-labelledby="android-install-steps-title">
            <div className="android-install-section-heading">
              <p>{text('一加 / OPPO 示例')}</p>
              <h3 id="android-install-steps-title">
                {text('安装时，按顺序这样操作')}
              </h3>
            </div>
            <div className="android-install-step-track">
              {INSTALL_STEPS.map((step, index) => (
                <figure key={step.image}>
                  <div className="android-install-step-number">{index + 1}</div>
                  <img
                    src={step.image}
                    alt={text(step.alt)}
                    width="1080"
                    height="2354"
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption>
                    <strong>{text(step.title)}</strong>
                    <span>{text(step.action)}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="android-install-swipe-hint">
              {text('左右滑动查看 3 个步骤')}
            </p>
          </section>

          <details className="android-install-brand-help">
            <summary>{text('其他安卓品牌在哪里设置？')}</summary>
            <div>
              <p>
                {text(
                  '不同机型的菜单名称会略有不同。优先在设置顶部搜索“安装未知应用”'
                  + '或“外部来源应用”。',
                )}
              </p>
              <dl>
                {BRAND_PATHS.map((brand) => (
                  <div key={brand.name}>
                    <dt>{text(brand.name)}</dt>
                    <dd>{text(brand.path)}</dd>
                  </div>
                ))}
              </dl>
              <p className="android-install-brand-safety">
                {text(
                  '只允许本次使用的浏览器或文件管理器，安装完成后建议关闭该权限。'
                  + '无需关闭 Play Protect 或整机安全扫描。',
                )}
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
            {text('开始下载官方 APK')}
          </a>
          <a href={GOOGLE_PLAY_URL} rel="noreferrer">
            {text('改用 Google Play')}
          </a>
        </footer>
      </article>
    </div>
  )
}
