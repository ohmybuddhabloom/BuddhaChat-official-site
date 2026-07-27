import { describe, expect, it } from 'vitest'

import { detectDownloadPlatform } from './downloadPlatform.js'

describe('detectDownloadPlatform', () => {
  it('detects iPhone and modern iPadOS', () => {
    expect(detectDownloadPlatform({ userAgent: 'Mozilla/5.0 (iPhone)', platform: 'iPhone' })).toBe('ios')
    expect(
      detectDownloadPlatform({
        userAgent: 'Mozilla/5.0 (Macintosh)',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      }),
    ).toBe('ios')
  })

  it('detects Android and keeps desktop as a neutral fallback', () => {
    expect(detectDownloadPlatform({ userAgent: 'Mozilla/5.0 (Linux; Android 15)' })).toBe('android')
    expect(detectDownloadPlatform({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)' })).toBe('other')
  })
})
