import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SharePage from './SharePage.jsx'
import { previewBlockCount, shareEnvironment, shareLinks, videoGuideDelaySec } from '../lib/sharePage.js'

// 1.4.5 任务8: the shared content sits in the middle of the first screen, the App is offered gently,
// and the page can be passed on from WeChat, WhatsApp or any browser.
const links = shareLinks(shareEnvironment('www.buddhachat.online'), 'yuanhui', 'yuanhui-001-q001', { r: 'abc123' })
const article = {
  state: 'ready',
  type: 'yuanhui',
  id: 'yuanhui-001-q001',
  title: '如何与师父心相应？',
  summary: '实际上修行真的是需要悟后起修的。',
  author: '源慧法师',
  blocks: [
    { type: 'quote', text: '问：如何与师父心相应？' },
    { type: 'paragraph', text: '第一段' },
    { type: 'paragraph', text: '第二段' },
    { type: 'paragraph', text: '第三段' },
    { type: 'paragraph', text: '第四段' },
    { type: 'paragraph', text: '第五段' },
  ],
  media: null,
  params: { r: 'abc123' },
  links,
}

describe('SharePage', () => {
  afterEach(() => vi.unstubAllGlobals())
  const phone = (ua, platform = 'iPhone') =>
    vi.stubGlobal('navigator', { userAgent: ua, platform, maxTouchPoints: 5, language: 'zh-CN', clipboard: { writeText: vi.fn(() => Promise.resolve()) } })

  it('shows about 40% of an article and the App, and keeps the rest one tap away', () => {
    phone('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari')
    render(<SharePage data={article} />)
    expect(screen.getByTestId('share-title').textContent).toBe('如何与师父心相应？')
    expect(screen.getByText('第二段')).toBeTruthy()
    expect(screen.queryByText('第五段')).toBeNull()
    expect(screen.getByTestId('share-download').getAttribute('href')).toBe('https://apps.apple.com/app/id6762049050')
    expect(screen.getByTestId('share-open').getAttribute('href')).toBe(links.appUrl)
    fireEvent.click(screen.getByTestId('share-expand'))
    expect(screen.getByText('第五段')).toBeTruthy()
    expect(screen.queryByTestId('share-guide')).toBeNull()
  })

  it('tells WeChat readers how to open the browser and how to pass the page on', () => {
    phone('Mozilla/5.0 (iPhone) MicroMessenger/8.0.50')
    render(<SharePage data={article} />)
    expect(screen.getByTestId('share-wechat').textContent).toContain('在浏览器打开')
    expect(screen.queryByTestId('share-open')).toBeNull()
    fireEvent.click(screen.getByTestId('share-reshare'))
    expect(screen.getByTestId('share-wechat-overlay').textContent).toContain('朋友圈')
  })

  it('never starts a download inside WeChat; it explains the browser hand-off instead', () => {
    phone('Mozilla/5.0 (Linux; Android 14) MicroMessenger/8.0.50', 'Linux')
    render(<SharePage data={article} />)
    expect(screen.queryByTestId('share-apk')).toBeNull()
    fireEvent.click(screen.getByTestId('share-download'))
    expect(screen.getByTestId('share-wechat-overlay').textContent).toContain('在浏览器打开')
  })

  it('keeps the WeChat hint on a missing item too', () => {
    phone('Mozilla/5.0 (iPhone) MicroMessenger/8.0.50')
    render(<SharePage data={{ state: 'missing', params: {}, links: { downloadUrl: '/download' } }} />)
    expect(screen.getByTestId('share-wechat')).toBeTruthy()
  })

  it('passes the page on with one more hand counted', () => {
    const share = vi.fn(() => Promise.resolve())
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome', platform: 'Linux', language: 'en', share })
    render(<SharePage data={article} />)
    fireEvent.click(screen.getByTestId('share-reshare'))
    expect(share).toHaveBeenCalledWith({ title: article.title, text: article.summary, url: links.reshare })
    expect(links.reshare).toContain('h=2')
    expect(screen.getByTestId('share-download').getAttribute('href')).toBe(links.googlePlayUrl)
  })

  it('uses the sharer’s language when the link names one', () => {
    phone('Mozilla/5.0 (iPhone) Safari')
    render(<SharePage data={{ ...article, params: { l: 'en' } }} />)
    expect(screen.getByTestId('share-reshare').textContent).toBe('Share with a friend')
  })

  it('plays a public video in the page', () => {
    phone('Mozilla/5.0 (iPhone) Safari')
    render(<SharePage data={{ ...article, type: 'video', blocks: [], media: { kind: 'video', embedUrl: 'https://www.buddhachat.online/videos/embed/UwWNDUfyxL9', durationSec: 899 } }} />)
    expect(screen.getByTestId('share-video').getAttribute('src')).toBe('https://www.buddhachat.online/videos/embed/UwWNDUfyxL9')
    expect(screen.queryByTestId('share-guide')).toBeNull()
  })

  it('explains a missing item instead of an empty page', () => {
    phone('Mozilla/5.0 (iPhone) Safari')
    render(<SharePage data={{ type: 'video', id: 'x', state: 'missing', links, params: {} }} />)
    expect(screen.getByTestId('share-state').textContent).toContain('删除')
  })

  it('offers the App at sensible points', () => {
    expect(previewBlockCount(2)).toBe(2)
    expect(previewBlockCount(6)).toBe(3)
    expect(previewBlockCount(20)).toBe(8)
    expect(videoGuideDelaySec(899)).toBe(300)
    expect(videoGuideDelaySec(90)).toBe(60)
    expect(videoGuideDelaySec(7200)).toBe(600)
    expect(videoGuideDelaySec(null)).toBe(120)
  })
})
