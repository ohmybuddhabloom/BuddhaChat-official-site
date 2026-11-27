import { describe, expect, it } from 'vitest'

import { allowShareEvent, fromSharePage, shareEventRecord, shareOpenAward } from './share-event.js'

// 1.4.5 任务8: share page events keep only what the share report needs, nothing personal.
const IPHONE_WECHAT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) MicroMessenger/8.0.50'

describe('share events', () => {
  it('keeps the content, the share values, the platform and WeChat, never anything personal', () => {
    expect(shareEventRecord({ event: 'open', type: 'video', id: 'UwWNDUfyxL9', r: 'abc123def456', ch: 'wechat', h: 2, l: 'zh-Hans', inApp: false, email: 'x@y.z' }, IPHONE_WECHAT)).toEqual({
      event: 'open', content_type: 'video', content_id: 'UwWNDUfyxL9', share_id: 'abc123def456', channel: 'wechat', hop: 2,
      locale: 'zh-Hans', platform: 'ios', in_wechat: true, in_app: false,
    })
    expect(shareEventRecord({ event: 'download', type: 'music', id: '1' }, 'Mozilla/5.0 (Linux; Android 14) Chrome')).toMatchObject({ platform: 'android', in_wechat: false, share_id: null, channel: null })
  })

  it('drops unknown events, bad ids, bad values and link-preview robots', () => {
    expect(shareEventRecord({ event: 'visit', type: 'video', id: 'UwWNDUfyxL9' }, IPHONE_WECHAT)).toBeNull()
    expect(shareEventRecord({ event: 'open', type: 'video', id: 'short' }, IPHONE_WECHAT)).toBeNull()
    expect(shareEventRecord({ event: 'open', type: 'constructor', id: '1' }, IPHONE_WECHAT)).toBeNull()
    expect(shareEventRecord({ event: 'open', type: 'qa', id: '23' }, 'facebookexternalhit/1.1')).toBeNull()
    expect(shareEventRecord(null, IPHONE_WECHAT)).toBeNull()
    expect(shareEventRecord({ event: 'open', type: 'qa', id: '23', r: '<x>', ch: 'Bad Channel', h: 500, l: 'fr' }, IPHONE_WECHAT))
      .toMatchObject({ share_id: null, channel: null, hop: null, locale: null })
  })

  it('stores only the App’s share id shape and the known channels, never free text', () => {
    const record = shareEventRecord({ event: 'open', type: 'qa', id: '23', r: '13800138000', ch: 'zhangsan' }, IPHONE_WECHAT)
    expect(record).toMatchObject({ share_id: null, channel: null })
    expect(shareEventRecord({ event: 'open', type: 'qa', id: '23', r: 'a1b2c3d4e5f6', ch: 'line' }, IPHONE_WECHAT)).toMatchObject({ share_id: 'a1b2c3d4e5f6', channel: 'line' })
  })

  it('pays the sharer only for a first browser open of a share with its id and the sharer’s code', () => {
    const body = { event: 'open', type: 'qa', id: '23', r: 'a1b2c3d4e5f6', ch: 'wechat', i: 'ABCD2345' }
    const record = shareEventRecord(body, IPHONE_WECHAT)
    expect(record).not.toHaveProperty('i')
    expect(JSON.stringify(record)).not.toContain('ABCD2345')
    expect(shareOpenAward(body, record)).toEqual({ code: 'ABCD2345', shareId: 'a1b2c3d4e5f6' })
    for (const other of [
      { ...body, event: 'download' },
      { ...body, inApp: true },
      { ...body, r: undefined },
      { ...body, i: 'abcd' },
      { ...body, i: 'ABCD234O' },
      { ...body, i: undefined },
    ]) {
      expect(shareOpenAward(other, shareEventRecord(other, IPHONE_WECHAT))).toBeNull()
    }
    expect(shareOpenAward(body, null)).toBeNull()
  })

  it('takes reports only from our share pages and at most 30 a minute from one address', () => {
    expect(fromSharePage({ origin: 'https://www.buddhachat.online', 'user-agent': IPHONE_WECHAT })).toBe(true)
    expect(fromSharePage({ referer: 'https://staging.buddhachat.online/s/qa/14', 'user-agent': IPHONE_WECHAT })).toBe(true)
    expect(fromSharePage({ origin: 'https://buddhachat.net', 'user-agent': IPHONE_WECHAT })).toBe(true)
    expect(fromSharePage({ referer: 'https://staging.buddhachat.net/s/qa/14', 'user-agent': IPHONE_WECHAT })).toBe(true)
    expect(fromSharePage({ origin: 'https://buddhachat.net.evil.example', 'user-agent': IPHONE_WECHAT })).toBe(false)
    expect(fromSharePage({ origin: 'https://evil.example', 'user-agent': IPHONE_WECHAT })).toBe(false)
    expect(fromSharePage({ origin: 'https://www.buddhachat.online' })).toBe(false)
    const now = 1_000_000
    for (let i = 0; i < 30; i += 1) expect(allowShareEvent('203.0.113.9', now)).toBe(true)
    expect(allowShareEvent('203.0.113.9', now)).toBe(false)
    expect(allowShareEvent('203.0.113.10', now)).toBe(true)
    expect(allowShareEvent('203.0.113.9', now + 61_000)).toBe(true)
  })
})
