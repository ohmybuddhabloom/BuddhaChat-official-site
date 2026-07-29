import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AppDownloadPage from './AppDownloadPage.jsx'

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
  })

  it('shows Google Play and direct APK actions on Android', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 15)',
      platform: 'Linux armv8l',
      maxTouchPoints: 5,
    })

    render(<AppDownloadPage />)

    expect(screen.queryByText('App Store 下载')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Google Play 下载/ })).toHaveAttribute(
      'href',
      'https://play.google.com/store/apps/details?id=com.chriskevin.buddhachat',
    )
    expect(screen.getByRole('link', { name: /安卓安装包下载/ })).toHaveAttribute(
      'href',
      '/download/android/latest.apk',
    )
    expect(screen.queryByText(/已识别为/)).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: /探索 BuddhaChat/ })).toBeInTheDocument()
  })

  it('shows the five product advantages', () => {
    render(<AppDownloadPage />)

    expect(screen.getByText('诸位法师的专属内容')).toBeInTheDocument()
    expect(screen.getByText('与佛祖进行心与心的沟通')).toBeInTheDocument()
    expect(screen.getByText('每日修行，日日精进')).toBeInTheDocument()
    expect(screen.getByText('与法师及师兄零距离沟通')).toBeInTheDocument()
    expect(screen.getByText('经书、视频、佛乐，一站汇聚')).toBeInTheDocument()
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
