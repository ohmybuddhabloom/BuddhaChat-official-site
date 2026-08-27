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
    titleZh: '浏览器提示“文件可能有害”',
    titleEn: 'Your browser says the file may be harmful',
    actionZh: '确认来源属于 buddhachat.online 后，点击“仍然下载”。',
    actionEn: 'Confirm that the source is buddhachat.online, then tap “Download anyway.”',
    image: '/download-guides/android-download-warning.jpg',
    altZh: '一加手机浏览器显示文件可能有害提示，右下角是仍然下载按钮',
    altEn: 'OnePlus browser warning that the file may be harmful, with the Download anyway button at lower right',
  },
  {
    titleZh: '出现“安装信息收集提醒”',
    titleEn: 'An installation information notice appears',
    actionZh: '确认安装来源后，点击“继续安装”。这是厂商对外部来源 APK 的安全确认。',
    actionEn: 'Confirm the source, then tap “Continue installation.” This is the manufacturer’s safety check for APKs from outside the app store.',
    image: '/download-guides/android-install-source-warning.jpg',
    altZh: '一加手机显示安装信息收集提醒，右侧是继续安装按钮',
    altEn: 'OnePlus installation information notice with the Continue installation button on the right',
  },
  {
    titleZh: '出现“敏感权限”提醒',
    titleEn: 'A sensitive permissions notice appears',
    actionZh: '先查看详情。权限提示不代表已经授权，确认后点击“继续安装”。',
    actionEn: 'Review the details first. The notice does not mean permission has already been granted. After checking, tap “Continue installation.”',
    image: '/download-guides/android-permission-warning.jpg',
    altZh: '一加手机显示敏感权限提醒，底部左侧是继续安装按钮',
    altEn: 'OnePlus sensitive permissions notice with the Continue installation button at lower left',
  },
]

const BRAND_PATHS = [
  {
    nameZh: '一加 / OPPO / realme',
    nameEn: 'OnePlus / OPPO / realme',
    pathZh: '通常按页面依次选择“仍然下载”“继续安装”；被拦截时，在设置中搜索“安装未知应用”。',
    pathEn: 'Choose “Download anyway” and then “Continue installation.” If blocked, search Settings for “Install unknown apps.”',
  },
  {
    nameZh: '小米 / Redmi',
    nameEn: 'Xiaomi / Redmi',
    pathZh: '设置 → 更多设置 → 隐私保护 → 特殊权限设置 → 安装未知应用。',
    pathEn: 'Settings → Additional settings → Privacy protection → Special permissions → Install unknown apps.',
  },
  {
    nameZh: '荣耀 / 华为',
    nameEn: 'HONOR / Huawei',
    pathZh: '设置 → 安全 → 更多安全设置 → 安装外部来源应用。',
    pathEn: 'Settings → Security → More security settings → Install apps from external sources.',
  },
  {
    nameZh: 'vivo / iQOO',
    nameEn: 'vivo / iQOO',
    pathZh: '在设置中搜索“安装未知应用”或“外部来源应用”，选择当前浏览器或文件管理器。',
    pathEn: 'Search Settings for “Install unknown apps” or “Apps from external sources,” then select your browser or file manager.',
  },
  {
    nameZh: '三星 Galaxy',
    nameEn: 'Samsung Galaxy',
    pathZh: '设置 → 安全和隐私 → 更多安全设置 → 安装未知应用。',
    pathEn: 'Settings → Security and privacy → More security settings → Install unknown apps.',
  },
  {
    nameZh: 'Pixel / 其他 Android',
    nameEn: 'Pixel / Other Android',
    pathZh: '设置 → 应用 → 特殊应用权限 → 安装未知应用。',
    pathEn: 'Settings → Apps → Special app access → Install unknown apps.',
  },
]

function releaseFileName(release, locale) {
  if (!release.versionName || !release.versionCode) {
    return locale === 'en' ? 'Official BuddhaChat APK' : 'BuddhaChat 官方 APK'
  }
  return `BuddhaChat-${release.versionName}-${release.versionCode}.apk`
}

export function AndroidDownloadNote({ release, onOpen, locale = 'zh' }) {
  const isEnglish = locale === 'en'

  return (
    <aside
      className="android-download-note"
      aria-label={isEnglish ? 'Android installation information' : '安卓安装说明'}
    >
      <div>
        <strong>
          {isEnglish
            ? 'Direct APK downloads include Android safety confirmations'
            : '直接下载安装包会出现安全确认'}
        </strong>
        <span>
          {release.versionName
            ? `${isEnglish ? 'Version' : '版本'} ${release.versionName}`
            : isEnglish
              ? 'Official Android APK'
              : '官方 Android 安装包'}
          {isEnglish
            ? ' · Official source · Installation steps available'
            : ' · 官网直供 · 安装步骤可查看'}
        </span>
      </div>
      <button type="button" onClick={onOpen}>
        {isEnglish ? 'Installation Information' : '安装前说明'}
      </button>
    </aside>
  )
}

export function AndroidDownloadConfirmation({
  release,
  onClose,
  onViewGuide,
  locale = 'zh',
}) {
  const isEnglish = locale === 'en'
  const closeButtonRef = useRef(null)
  const version = release.versionName && release.versionCode
    ? isEnglish
      ? `BuddhaChat ${release.versionName} (${release.versionCode}) official APK`
      : `BuddhaChat ${release.versionName}（${release.versionCode}）官方 APK`
    : isEnglish
      ? 'Official BuddhaChat APK'
      : 'BuddhaChat 官方 APK'

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
      <section
        className="android-download-confirmation"
        role="dialog"
        aria-modal="true"
        aria-labelledby="android-download-confirmation-title"
      >
        <header>
          <div>
            <p>{version}</p>
            <h2 id="android-download-confirmation-title">
              {isEnglish
                ? 'Confirm Before Downloading the Official APK'
                : '下载官方 APK 前请确认'}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            className="android-install-guide-close"
            type="button"
            aria-label={isEnglish ? 'Close download confirmation' : '关闭下载确认'}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="android-download-confirmation-body">
          <p>
            {isEnglish
              ? 'Your browser may later warn that the file might be harmful. This is Android’s standard warning for APKs outside an app store. Confirm the buddhachat.online source, then choose “Download anyway.”'
              : '浏览器可能稍后提示“文件可能有害”。这是 Android 对非应用商店 APK 的通用提醒。确认来源为 buddhachat.online 后，请选择“仍然下载”。'}
          </p>
          <dl>
            <div>
              <dt>{isEnglish ? 'Official source' : '官方来源'}</dt>
              <dd>buddhachat.online</dd>
            </div>
            <div>
              <dt>{isEnglish ? 'App package' : '应用包名'}</dt>
              <dd>{release.packageName}</dd>
            </div>
          </dl>
        </div>
        <footer>
          <a
            href={release.apkUrl}
            rel="noreferrer"
            onClick={() => trackCtaClick('app_download_apk_confirmed', 'app')}
          >
            {isEnglish ? 'Continue to Download the APK' : '继续下载官方 APK'}
          </a>
          <a href={GOOGLE_PLAY_URL} rel="noreferrer">
            {isEnglish ? 'Use Google Play Instead' : '改用 Google Play'}
          </a>
          <button type="button" onClick={onViewGuide}>
            {isEnglish ? 'View Full Installation Information' : '查看完整安装说明'}
          </button>
        </footer>
      </section>
    </div>
  )
}

export default function AndroidInstallGuide({ release, onClose, locale = 'zh' }) {
  const isEnglish = locale === 'en'
  const closeButtonRef = useRef(null)
  const [copyStatus, setCopyStatus] = useState('idle')
  const [variant, setVariant] = useState(isEnglish ? 'en' : 'hans')
  const [traditionalConverter, setTraditionalConverter] = useState(null)
  const [languageLoading, setLanguageLoading] = useState(false)
  const text =
    variant === 'hant' && traditionalConverter
      ? traditionalConverter
      : (value) => value
  const localize = (simplified, english) =>
    isEnglish ? english : text(simplified)

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
        lang={isEnglish ? 'en' : variant === 'hant' ? 'zh-Hant' : 'zh-Hans'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="android-install-title"
      >
        <header className="android-install-guide-header">
          <div>
            <p>{localize('Android 官方安装包', 'Official Android APK')}</p>
            <h2 id="android-install-title">
              {localize('下载前，先确认这 4 项', 'Confirm These 4 Details Before Downloading')}
            </h2>
          </div>
          <div className="android-install-guide-controls">
            {!isEnglish ? (
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
            ) : null}
            <button
              ref={closeButtonRef}
              className="android-install-guide-close"
              type="button"
              aria-label={localize('关闭安装说明', 'Close installation information')}
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </header>

        <div className="android-install-guide-body">
          <p className="android-install-intro">
            {localize(
              'Android 会对从浏览器安装的 APK 增加安全确认。出现“可能有害”“未知来源”'
              + '或“敏感权限”等提示，不等于系统已经判定 BuddhaChat 有病毒，请先核对安装包信息。',
              'Android adds safety confirmations when you install an APK from a browser. '
              + 'Warnings such as “may be harmful,” “unknown source,” or “sensitive permissions” '
              + 'do not mean Android has identified BuddhaChat as a virus. Verify the APK details first.',
            )}
          </p>

          <dl className="android-install-verification">
            <div>
              <dt>{localize('版本', 'Version')}</dt>
              <dd>
                {release.versionName && release.versionCode
                  ? isEnglish
                    ? `${release.versionName} (${release.versionCode})`
                    : `${release.versionName}（${release.versionCode}）`
                  : localize('正在获取最新版本', 'Getting the latest version')}
              </dd>
            </div>
            <div>
              <dt>{localize('文件名', 'File Name')}</dt>
              <dd>{text(releaseFileName(release, locale))}</dd>
            </div>
            <div>
              <dt>{localize('官方来源', 'Official Source')}</dt>
              <dd>
                {localize(
                  'BuddhaChat 官方服务器（buddhachat.online）',
                  'Official BuddhaChat server (buddhachat.online)',
                )}
              </dd>
            </div>
            <div>
              <dt>{localize('应用包名', 'App Package')}</dt>
              <dd>{release.packageName}</dd>
            </div>
          </dl>

          <details className="android-install-hash-help">
            <summary>{localize('高级校验（可选）', 'Advanced Verification (Optional)')}</summary>
            <div>
              <p>
                {localize(
                  'SHA-256 是安装包的数字指纹。普通用户无需操作；如需核验，'
                  + '请用支持 SHA-256 的文件校验工具计算下载文件，并与下方数值逐字比较。',
                  'SHA-256 is the APK’s digital fingerprint. Most users do not need to do this. '
                  + 'To verify the file, calculate its SHA-256 with a checksum tool and compare every character below.',
                )}
              </p>
              <div className="android-install-hash-value">
                <span>SHA-256</span>
                <code>{release.sha256 || localize('正在获取校验值', 'Getting checksum')}</code>
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
                      ? localize('已复制', 'Copied')
                      : copyStatus === 'failed'
                        ? localize('复制失败', 'Copy Failed')
                        : localize('复制校验值', 'Copy Checksum')}
                  </button>
                ) : null}
              </div>
              <p>
                {localize(
                  '两者完全一致，表示下载文件与官网发布的安装包内容一致。',
                  'An exact match confirms that the downloaded file is identical to the APK published on the official site.',
                )}
              </p>
            </div>
          </details>

          <div className="android-install-safety-note">
            <strong>{localize('什么情况下不要继续？', 'When Should You Stop?')}</strong>
            <p>
              {localize(
                '如果系统明确显示“发现病毒”或“恶意应用”，或者域名、文件名、版本与上方信息不一致，'
                + '请取消安装。',
                'Cancel the installation if Android explicitly reports a virus or malicious app, '
                + 'or if the domain, file name, or version does not match the information above.',
              )}
              <span className="android-install-store-verification">
                {localize(
                  'BuddhaChat 商店版已通过 App Store 与 Google Play 官方验证。',
                  'The BuddhaChat store editions have passed App Store and Google Play review.',
                )}
              </span>
              {localize(
                '官网 APK 在发布前还会自动校验包名和官方签名。',
                'Before release, the official APK is also automatically checked for the correct package name and official signature.',
              )}
            </p>
          </div>

          <section className="android-install-steps" aria-labelledby="android-install-steps-title">
            <div className="android-install-section-heading">
              <p>{localize('一加 / OPPO 示例', 'OnePlus / OPPO Example')}</p>
              <h3 id="android-install-steps-title">
                {localize('安装时，按顺序这样操作', 'Follow These Steps in Order')}
              </h3>
            </div>
            <div className="android-install-step-track">
              {INSTALL_STEPS.map((step, index) => (
                <figure key={step.image}>
                  <div className="android-install-step-number">{index + 1}</div>
                  <img
                    src={step.image}
                    alt={localize(step.altZh, step.altEn)}
                    width="1080"
                    height="2354"
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption>
                    <strong>{localize(step.titleZh, step.titleEn)}</strong>
                    <span>{localize(step.actionZh, step.actionEn)}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="android-install-swipe-hint">
              {localize('左右滑动查看 3 个步骤', 'Swipe to view all 3 steps')}
            </p>
          </section>

          <details className="android-install-brand-help">
            <summary>
              {localize('其他安卓品牌在哪里设置？', 'Where Is This Setting on Other Android Brands?')}
            </summary>
            <div>
              <p>
                {localize(
                  '不同机型的菜单名称会略有不同。优先在设置顶部搜索“安装未知应用”'
                  + '或“外部来源应用”。',
                  'Menu names vary by device. Search Settings for “Install unknown apps” '
                  + 'or “Apps from external sources” first.',
                )}
              </p>
              <dl>
                {BRAND_PATHS.map((brand) => (
                  <div key={brand.nameEn}>
                    <dt>{localize(brand.nameZh, brand.nameEn)}</dt>
                    <dd>{localize(brand.pathZh, brand.pathEn)}</dd>
                  </div>
                ))}
              </dl>
              <p className="android-install-brand-safety">
                {localize(
                  '只允许本次使用的浏览器或文件管理器，安装完成后建议关闭该权限。'
                  + '无需关闭 Play Protect 或整机安全扫描。',
                  'Allow only the browser or file manager you are using. Turn this permission off after installation. '
                  + 'You do not need to disable Play Protect or device-wide security scanning.',
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
            {localize('开始下载官方 APK', 'Download the Official APK')}
          </a>
          <a href={GOOGLE_PLAY_URL} rel="noreferrer">
            {localize('改用 Google Play', 'Use Google Play Instead')}
          </a>
        </footer>
      </article>
    </div>
  )
}
