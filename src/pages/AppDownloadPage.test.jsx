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

    render(<AppDownloadPage />)

    expect(screen.getByRole('link', { name: /App Store 下载/ })).toHaveAttribute(
      'href',
      'https://apps.apple.com/app/id6762049050',
    )
    expect(screen.queryByText('Google Play 下载')).not.toBeInTheDocument()
    expect(screen.queryByText('安卓安装包')).not.toBeInTheDocument()
  })

  it('shows Google Play and direct APK actions on Android', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 15)',
      platform: 'Linux armv8l',
      maxTouchPoints: 5,
    })

    render(<AppDownloadPage />)

    expect(screen.queryByText('App Store 下载')).not.toBeInTheDocument()
    expect(screen.getByText('Google Play 下载')).toBeInTheDocument()
    expect(screen.getByText('安卓安装包')).toBeInTheDocument()
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

  it('shows the three selected app experiences', () => {
    render(<AppDownloadPage />)

    expect(screen.getByText('持续修行')).toBeInTheDocument()
    expect(screen.getByText('与大师沟通')).toBeInTheDocument()
    expect(screen.getByText('AI 佛祖对话')).toBeInTheDocument()
  })

  it('moves the app preview carousel with its controls', () => {
    const scrollBy = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollBy', { configurable: true, value: scrollBy })

    render(<AppDownloadPage />)
    fireEvent.click(screen.getByRole('button', { name: '下一张' }))

    expect(scrollBy).toHaveBeenCalledWith({ left: 300, behavior: 'smooth' })
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollBy')
  })
})
