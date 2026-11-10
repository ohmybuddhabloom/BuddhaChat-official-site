import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import JoinInvitePage from './JoinInvitePage.jsx'
import { inviteAppLink, readInviteCode } from '../lib/inviteLink.js'
import { getPageMeta } from '../../api/page-entry.js'

// Dojo invites used to 302 straight to buddhachat://join/<code>, which shows nothing in WeChat or a
// browser without the App. This landing page is what the invite link now opens.
describe('JoinInvitePage', () => {
  afterEach(() => vi.unstubAllGlobals())
  const phone = (ua) => vi.stubGlobal('navigator', { userAgent: ua, platform: 'iPhone', maxTouchPoints: 5, language: 'zh-CN', clipboard: { writeText: vi.fn() } })

  it('reads only well-formed codes from the path', () => {
    expect(readInviteCode('/join/ZEN-0123456789ABCDEF0123456789ABCDEF')).toBe('ZEN-0123456789ABCDEF0123456789ABCDEF')
    expect(readInviteCode('/join/AB12-cd34')).toBe('AB12-cd34')
    expect(readInviteCode('/join/AB12cd34/')).toBe('AB12cd34')
    expect(readInviteCode('/join')).toBeNull()
    expect(readInviteCode('/join/a')).toBeNull()
    expect(readInviteCode('/join/<script>')).toBeNull()
    expect(readInviteCode('/join/%E0%A4%A')).toBeNull()
    expect(readInviteCode('/join/abcd/extra')).toBeNull()
  })

  it('opens the Production App from www and the Staging App from staging', () => {
    expect(inviteAppLink('AB12cd34', 'www.buddhachat.online')).toBe('buddhachat://join/AB12cd34')
    expect(inviteAppLink('AB12cd34', 'staging.buddhachat.online')).toBe('buddhachat-staging://join/AB12cd34')
  })

  it('shows the code, an open-in-App button and the download fallback in a phone browser', () => {
    phone('Mozilla/5.0 (iPhone) Safari')
    render(<JoinInvitePage pathname="/join/AB12cd34" hostname="www.buddhachat.online" language="zh-CN" />)
    expect(screen.getByTestId('join-invite-code').textContent).toBe('AB12cd34')
    expect(screen.getByTestId('join-invite-open').getAttribute('href')).toBe('buddhachat://join/AB12cd34')
    expect(screen.getByTestId('join-invite-download').getAttribute('href')).toBe('/download')
    expect(screen.queryByTestId('join-invite-wechat')).toBeNull()
  })

  it('in WeChat explains how to leave for a browser instead of a button WeChat would block', () => {
    phone('Mozilla/5.0 (iPhone) MicroMessenger/8.0')
    render(<JoinInvitePage pathname="/join/AB12cd34" hostname="www.buddhachat.online" language="zh-CN" />)
    expect(screen.getByTestId('join-invite-wechat').textContent).toMatch(/在浏览器打开/)
    expect(screen.queryByTestId('join-invite-open')).toBeNull()
  })

  it('says the link is incomplete rather than showing a broken button', () => {
    phone('Mozilla/5.0 (iPhone) Safari')
    render(<JoinInvitePage pathname="/join" hostname="www.buddhachat.online" language="en-US" />)
    expect(screen.getByTestId('join-invite-invalid')).toBeTruthy()
    expect(screen.queryByTestId('join-invite-open')).toBeNull()
  })

  it('speaks Traditional Chinese and English by browser language', () => {
    phone('Mozilla/5.0 (iPhone) Safari')
    const { unmount } = render(<JoinInvitePage pathname="/join/AB12cd34" hostname="www.buddhachat.online" language="zh-TW" />)
    expect(screen.getByTestId('join-invite-open').textContent).toBe('打開 App 加入道場')
    unmount()
    render(<JoinInvitePage pathname="/join/AB12cd34" hostname="www.buddhachat.online" language="en-GB" />)
    expect(screen.getByTestId('join-invite-open').textContent).toBe('Open the App to join')
  })

  it('hides the site-wide Open-in-App pill that would compete with the join button', () => {
    phone('Mozilla/5.0 (iPhone) Safari')
    const { container } = render(<JoinInvitePage pathname="/join/AB12cd34" hostname="www.buddhachat.online" language="zh-CN" />)
    expect(container.querySelector('style').textContent).toContain('[data-open-in-app]{display:none!important}')
  })

  it('gives forwarded invite links a dojo-invite share card without indexing each code', () => {
    const meta = getPageMeta(new URL('https://www.buddhachat.online/api/page-entry?path=join/AB12cd34'))
    expect(meta.title).toMatch(/道场邀请/)
    expect(meta.canonicalUrl).toBe('https://www.buddhachat.online/download')
  })
})
