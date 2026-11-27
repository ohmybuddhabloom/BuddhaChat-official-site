import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import LampInvitePage from './LampInvitePage.jsx'
import { lampLinks, readLampCity, readLampCode } from '../lib/lampLink.js'
import { getPageMeta } from '../../api/page-entry.js'

// 传灯 (Owner 2026-11-22): the link a friend receives from 支持我们. It must open in WeChat and in a
// browser, read like a letter, and download the App with the sharer's invite code still attached.
describe('LampInvitePage', () => {
  afterEach(() => vi.unstubAllGlobals())
  const phone = (ua, platform = 'iPhone') =>
    vi.stubGlobal('navigator', { userAgent: ua, platform, maxTouchPoints: 5, language: 'zh-CN', clipboard: { writeText: vi.fn(() => Promise.resolve()) } })

  it('reads only referral codes and plain place names', () => {
    expect(readLampCode('/lamp/ABCDEFGH')).toBe('ABCDEFGH')
    expect(readLampCode('/lamp/abcdefgh/')).toBe('ABCDEFGH')
    expect(readLampCode('/lamp/ABCDEFG1')).toBeNull()
    expect(readLampCode('/lamp/ABC')).toBeNull()
    expect(readLampCode('/lamp/ABCDEFGH/extra')).toBeNull()
    expect(readLampCity('?c=%E5%A5%A5%E5%85%8B%E5%85%B0')).toBe('奥克兰')
    expect(readLampCity('?c=Kuala%20Lumpur')).toBe('Kuala Lumpur')
    expect(readLampCity('?c=%3Cscript%3E')).toBeNull()
    expect(readLampCity('')).toBeNull()
  })

  it('carries the page the App already reads after an install, per environment', () => {
    const prod = lampLinks('ABCDEFGH', 'www.buddhachat.online')
    expect(prod.target).toBe('https://www.buddhachat.online/?invite=ABCDEFGH')
    expect(prod.link).toBe('https://go.buddhachat.online/l/page?url=https%3A%2F%2Fwww.buddhachat.online%2F%3Finvite%3DABCDEFGH')
    expect(prod.appUrl).toBe('buddhachat://l/page?url=https%3A%2F%2Fwww.buddhachat.online%2F%3Finvite%3DABCDEFGH')
    expect(prod.googlePlayUrl).toContain('id=com.chriskevin.buddhachat&referrer=')
    expect(decodeURIComponent(prod.googlePlayUrl.split('referrer=')[1])).toContain(`deep_link=${encodeURIComponent(prod.link)}`)
    const staging = lampLinks('ABCDEFGH', 'staging.buddhachat.online')
    expect(staging.target).toBe('https://staging.buddhachat.online/?invite=ABCDEFGH')
    expect(staging.appUrl.startsWith('buddhachat-staging://l/page?url=')).toBe(true)
    expect(staging.googlePlayUrl).toBeNull()
    // On the backup share domain: same environment, downloads stay on it, the App still gets the main site.
    const backup = lampLinks('ABCDEFGH', 'buddhachat.net')
    expect(backup.target).toBe('https://www.buddhachat.online/?invite=ABCDEFGH')
    expect(backup.apkUrl).toBe('https://buddhachat.net/downloads/android/latest.apk')
    expect(backup.downloadUrl).toBe('https://buddhachat.net/download')
    const stagingBackup = lampLinks('ABCDEFGH', 'staging.buddhachat.net')
    expect(stagingBackup.target).toBe('https://staging.buddhachat.online/?invite=ABCDEFGH')
    expect(stagingBackup.appUrl.startsWith('buddhachat-staging://')).toBe(true)
    expect(stagingBackup.downloadUrl).toBe('https://staging.buddhachat.net/download')
  })

  it('names only the city, quotes one teaching, and records the page before the App Store on iPhone', () => {
    phone('Mozilla/5.0 (iPhone) Safari')
    render(<LampInvitePage pathname="/lamp/ABCDEFGH" search="?c=%E5%A5%A5%E5%85%8B%E5%85%B0" hostname="www.buddhachat.online" language="zh-CN" />)
    expect(screen.getByTestId('lamp-title').textContent).toBe('一位在奥克兰的师兄，为你点亮了一盏灯')
    expect(screen.getByText('诸恶莫作，众善奉行，')).toBeTruthy()
    expect(screen.getByTestId('lamp-download').getAttribute('href')).toBe('https://apps.apple.com/app/id6762049050')
    expect(screen.getByTestId('lamp-open').getAttribute('href')).toContain('buddhachat://l/page?url=')
    expect(screen.getByTestId('lamp-code').textContent).toBe('ABCDEFGH')
    expect(screen.queryByTestId('lamp-wechat')).toBeNull()
    expect(screen.getByText('在 App 里还可以')).toBeTruthy()
  })

  it('in WeChat on Android explains the browser step and offers the package, never a dead open button', () => {
    phone('Mozilla/5.0 (Linux; Android 14) MicroMessenger/8.0', 'Linux armv8l')
    render(<LampInvitePage pathname="/lamp/ABCDEFGH" search="" hostname="www.buddhachat.online" language="zh-CN" />)
    expect(screen.getByTestId('lamp-wechat').textContent).toContain('在浏览器打开')
    expect(screen.queryByTestId('lamp-open')).toBeNull()
    expect(screen.getByTestId('lamp-title').textContent).toBe('一位师兄，为你点亮了一盏灯')
    expect(screen.getByTestId('lamp-download').getAttribute('href')).toContain('play.google.com')
    expect(screen.getByTestId('lamp-apk').getAttribute('href')).toBe('https://www.buddhachat.online/downloads/android/latest.apk')
  })

  it('a broken link still leads to the download', () => {
    phone('Mozilla/5.0 (iPhone) Safari')
    render(<LampInvitePage pathname="/lamp/x" search="" hostname="www.buddhachat.online" language="zh-CN" />)
    expect(screen.getByTestId('lamp-invalid')).toBeTruthy()
  })

  it('gives WeChat a lamp card instead of the generic site card', () => {
    const meta = getPageMeta(new URL('https://www.buddhachat.online/api/page-entry?path=lamp/ABCDEFGH'))
    expect(meta.title).toContain('点亮了一盏灯')
    expect(meta.imageUrl).toBe('https://www.buddhachat.online/share/lamp-card-v1.jpg')
  })
})
