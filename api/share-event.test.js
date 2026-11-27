import { describe, expect, it } from 'vitest'

import { shareEventRecord } from './share-event.js'

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
})
