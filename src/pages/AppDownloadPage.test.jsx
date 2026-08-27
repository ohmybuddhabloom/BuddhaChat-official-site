import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AppDownloadPage from './AppDownloadPage.jsx'

const androidRelease = {
  platform: 'android',
  packageName: 'com.chriskevin.buddhachat',
  versionCode: 11,
  versionName: '1.3.1',
  apkUrl: 'https://www.buddhachat.online/downloads/android/latest.apk',
  sha256: '6ad581837eb6eea256da117af980b7c56d101098d935a255bf10859217896796',
}

describe('AppDownloadPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows only the App Store action on iOS', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone)',
      platform: 'iPhone',
      maxTouchPoints: 1,
    })

    const { container } = render(<AppDownloadPage />)

    expect(screen.getByRole('link', { name: /App Store 下载/ })).toHaveAttribute(
      'href',
      'https://apps.apple.com/app/id6762049050',
    )
    expect(container.querySelector('img.is-ios')).toHaveAttribute(
      'src',
      '/download-icons/apple-official.svg',
    )
    expect(screen.queryByText('Google Play 下载')).not.toBeInTheDocument()
    expect(screen.queryByText('安卓安装包下载')).not.toBeInTheDocument()
    expect(screen.queryByText('安装前说明')).not.toBeInTheDocument()
  })

  it('guides iPhone WeChat users to open the download in a system browser', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone) AppleWebKit MicroMessenger/8.0.58',
      platform: 'iPhone',
      maxTouchPoints: 1,
    })

    render(<AppDownloadPage />)
    fireEvent.click(screen.getByRole('link', { name: /App Store 下载/ }))

    expect(screen.getByRole('dialog', { name: '请在浏览器中打开' })).toBeInTheDocument()
    expect(screen.getByText(/在 Safari 中打开/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '仍然尝试打开' })).toHaveAttribute(
      'href',
      'https://apps.apple.com/app/id6762049050',
    )
  })

  it('copies the blocked download link for WeChat users', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 15) MicroMessenger/8.0.58',
      platform: 'Linux armv8l',
      maxTouchPoints: 5,
      clipboard: { writeText },
    })

    render(<AppDownloadPage />)
    fireEvent.click(screen.getByRole('link', { name: /Google Play 下载/ }))
    fireEvent.click(screen.getByRole('button', { name: '复制下载链接' }))

    expect(writeText).toHaveBeenCalledWith(
      'https://play.google.com/store/apps/details?id=com.chriskevin.buddhachat',
    )
    expect(await screen.findByRole('button', { name: '链接已复制' })).toBeInTheDocument()
  })

  it('explains the delayed Android browser warning before starting an APK download', async () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 15)',
      platform: 'Linux armv8l',
      maxTouchPoints: 5,
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => androidRelease,
    }))

    render(<AppDownloadPage />)

    expect(screen.queryByText('App Store 下载')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Google Play 下载/ })).toHaveAttribute(
      'href',
      'https://play.google.com/store/apps/details?id=com.chriskevin.buddhachat',
    )
    await screen.findByText('版本 1.3.1 · 官网直供 · 安装步骤可查看')
    const apkButton = screen.getByRole('button', { name: /安卓安装包下载/ })
    expect(screen.getByText('直接下载安装包会出现安全确认')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '安装前说明' })).toBeInTheDocument()

    fireEvent.click(apkButton)

    expect(
      screen.getByRole('dialog', { name: '下载官方 APK 前请确认' }),
    ).toBeInTheDocument()
    expect(screen.getByText('BuddhaChat 1.3.1（11）官方 APK')).toBeInTheDocument()
    expect(screen.getByText(/浏览器可能稍后提示“文件可能有害”/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '继续下载官方 APK' })).toHaveAttribute(
      'href',
      androidRelease.apkUrl,
    )
    expect(screen.getByRole('link', { name: '改用 Google Play' })).toHaveAttribute(
      'href',
      'https://play.google.com/store/apps/details?id=com.chriskevin.buddhachat',
    )
    fireEvent.click(screen.getByRole('button', { name: '查看完整安装说明' }))
    expect(
      screen.getByRole('dialog', { name: '下载前，先确认这 4 项' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/已识别为/)).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: /探索 BuddhaChat/ })).toBeInTheDocument()
  })

  it('shows verified release details and installation steps before an APK download', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 15)',
      platform: 'Linux armv8l',
      maxTouchPoints: 5,
      clipboard: { writeText },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => androidRelease,
    }))

    render(<AppDownloadPage />)

    await waitFor(() => {
      expect(
        screen.getByText('版本 1.3.1 · 官网直供 · 安装步骤可查看'),
      ).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: '安装前说明' }))

    expect(
      screen.getByRole('dialog', { name: '下载前，先确认这 4 项' }),
    ).toHaveAttribute('lang', 'zh-Hans')
    expect(screen.getByRole('button', { name: '简' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('1.3.1（11）')).toBeInTheDocument()
    expect(screen.getByText('BuddhaChat-1.3.1-11.apk')).toBeInTheDocument()
    expect(
      screen.getByText('BuddhaChat 官方服务器（buddhachat.online）'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/music\.buddhachat\.online/)).not.toBeInTheDocument()
    expect(screen.getByText('com.chriskevin.buddhachat')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '开始下载官方 APK' })).toHaveAttribute(
      'href',
      androidRelease.apkUrl,
    )
    expect(screen.getByRole('link', { name: '改用 Google Play' })).toHaveAttribute(
      'href',
      'https://play.google.com/store/apps/details?id=com.chriskevin.buddhachat',
    )

    expect(screen.getAllByRole('img', { name: /一加手机/ })).toHaveLength(3)
    expect(screen.getByText('小米 / Redmi')).toBeInTheDocument()
    expect(screen.getByText('荣耀 / 华为')).toBeInTheDocument()
    expect(screen.getByText('vivo / iQOO')).toBeInTheDocument()
    expect(screen.getByText('三星 Galaxy')).toBeInTheDocument()
    expect(
      screen.getByText(
        'BuddhaChat 商店版已通过 App Store 与 Google Play 官方验证。',
      ),
    ).toHaveClass('android-install-store-verification')

    expect(screen.getByText('高级校验（可选）')).toBeInTheDocument()
    expect(screen.getByText(androidRelease.sha256)).not.toBeVisible()
    fireEvent.click(screen.getByText('高级校验（可选）'))
    expect(screen.getByText(androidRelease.sha256)).toBeVisible()
    expect(screen.getByText(/SHA-256 是安装包的数字指纹/)).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: '复制校验值' }))
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(androidRelease.sha256)
    })

    fireEvent.click(screen.getByRole('button', { name: '繁' }))
    expect(
      await screen.findByRole('dialog', { name: '下載前，先確認這 4 項' }),
    ).toHaveAttribute('lang', 'zh-Hant')
    expect(screen.getByRole('button', { name: '繁' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: '简' }))
    expect(
      screen.getByRole('dialog', { name: '下载前，先确认这 4 项' }),
    ).toBeInTheDocument()
  })

  it('keeps the WeChat browser handoff ahead of the APK installation guide', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 15) MicroMessenger/8.0.58',
      platform: 'Linux armv8l',
      maxTouchPoints: 5,
    })

    render(<AppDownloadPage />)
    fireEvent.click(screen.getByRole('link', { name: /安卓安装包下载/ }))

    expect(screen.getByRole('dialog', { name: '请在浏览器中打开' })).toBeInTheDocument()
    expect(
      screen.queryByRole('dialog', { name: '下载前，先确认这 4 项' }),
    ).not.toBeInTheDocument()
  })

  it('shows the five product advantages', () => {
    render(<AppDownloadPage />)

    expect(screen.getByText('诸位法师的专属内容')).toBeInTheDocument()
    expect(screen.getByText('与佛祖进行心与心的沟通')).toBeInTheDocument()
    expect(screen.getByText('每日修行，日日精进')).toBeInTheDocument()
    expect(screen.getByText('与法师及师兄零距离沟通')).toBeInTheDocument()
    expect(screen.getByText('经书、视频、佛乐，一站汇聚')).toBeInTheDocument()
  })

  it('renders a fully English page while preserving downloads and installation guidance', async () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 15)',
      platform: 'Linux armv8l',
      maxTouchPoints: 5,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => androidRelease,
    }))

    const { container } = render(<AppDownloadPage locale="en" />)

    expect(
      await screen.findByText(
        'Version 1.3.1 · Official source · Installation steps available',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /One Mindful Connection,.*Boundless Dharma by Your Side/,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Get it on Google Play/ })).toHaveAttribute(
      'href',
      'https://play.google.com/store/apps/details?id=com.chriskevin.buddhachat',
    )
    fireEvent.click(screen.getByRole('button', { name: /Download Android APK/ }))
    expect(
      screen.getByRole('dialog', { name: 'Confirm Before Downloading the Official APK' }),
    ).not.toHaveTextContent(/[\u4e00-\u9fff]/)
    expect(screen.getByRole('link', { name: 'Continue to Download the APK' })).toHaveAttribute(
      'href',
      androidRelease.apkUrl,
    )
    fireEvent.click(screen.getByRole('button', { name: 'View Full Installation Information' }))
    expect(container).not.toHaveTextContent(/[\u4e00-\u9fff]/)

    const dialog = screen.getByRole('dialog', {
      name: 'Confirm These 4 Details Before Downloading',
    })
    expect(dialog).toHaveAttribute('lang', 'en')
    expect(dialog).not.toHaveTextContent(/[\u4e00-\u9fff]/)
    expect(screen.queryByRole('button', { name: '简' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '繁' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: /OnePlus/ })).toHaveLength(3)
    expect(screen.getByRole('link', { name: 'Download the Official APK' })).toHaveAttribute(
      'href',
      androidRelease.apkUrl,
    )
  })

  it('shows the seven selected app experiences', () => {
    render(<AppDownloadPage />)

    expect(screen.getByText('每日法师推荐')).toBeInTheDocument()
    expect(screen.getByText('持续修行')).toBeInTheDocument()
    expect(screen.getByText('佛乐相伴')).toBeInTheDocument()
    expect(screen.getByText('AI 解读与读经')).toBeInTheDocument()
    expect(screen.getByText('法师开示')).toBeInTheDocument()
    expect(screen.getByText('道场共修')).toBeInTheDocument()
    expect(screen.getByText('AI 佛祖对话')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'BuddhaChat 首页真实页面' })).toHaveAttribute(
      'src',
      '/app-previews/app-home-mobile.avif',
    )
    expect(screen.getByRole('img', { name: 'BuddhaChat 每日修行真实页面' })).toHaveAttribute(
      'src',
      '/app-previews/app-practice-mobile.avif',
    )
    expect(screen.getByRole('img', { name: 'BuddhaChat 佛乐场景真实页面' })).toHaveAttribute(
      'src',
      '/app-previews/app-music-mobile.avif',
    )
    expect(screen.getByRole('img', { name: 'BuddhaChat 读经导航真实页面' })).toHaveAttribute(
      'src',
      '/app-previews/app-scriptures-mobile.avif',
    )
    expect(screen.getByRole('img', { name: 'BuddhaChat 法师开示真实页面' })).toHaveAttribute(
      'src',
      '/app-previews/app-master-talks-mobile.avif',
    )
    expect(screen.getByRole('img', { name: 'BuddhaChat 道场与共修社区真实页面' })).toHaveAttribute(
      'src',
      '/app-previews/app-community-mobile.avif',
    )
    expect(screen.getByRole('img', { name: 'BuddhaChat AI 佛祖对话真实页面' })).toHaveAttribute(
      'src',
      '/app-previews/app-ai-buddha-mobile.avif',
    )
  })

  it('moves the app preview carousel with its controls', () => {
    const scrollBy = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollBy', { configurable: true, value: scrollBy })

    const { container } = render(<AppDownloadPage />)
    const card = container.querySelector('.campaign-download-gallery-track figure')
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({ width: 238 })

    fireEvent.click(screen.getByRole('button', { name: '下一张' }))

    expect(scrollBy).toHaveBeenCalledWith({ left: 238, behavior: 'smooth' })
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollBy')
  })
})
