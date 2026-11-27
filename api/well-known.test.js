import { describe, expect, it } from 'vitest'

import { appleAppSiteAssociation, assetLinks } from './well-known.js'

// 1.4.5 任务8: the files that let the 1.4.5 shell open www share pages directly.
describe('www app links', () => {
  it('lets the App claim share pages and 传灯 letters, never their images', () => {
    const prod = appleAppSiteAssociation('production').applinks.details[0]
    expect(prod.appID).toBe('V85365UK7R.com.chriskevin.buddhachat-rn-expo-claude-to-codex')
    expect(prod.components.map((c) => [c['/'], Boolean(c.exclude)])).toEqual([
      ['/s/*/*/card.jpg', true],
      ['/s/*/*/poster.png', true],
      ['/s/*', false],
      ['/lamp/*', false],
    ])
    expect(JSON.stringify(prod)).not.toContain('/join')
    expect(appleAppSiteAssociation('staging').applinks.details[0].appID).toMatch(/\.staging$/)
  })

  it('trusts each environment’s Android signing certificates', () => {
    expect(assetLinks('production')[0].target.package_name).toBe('com.chriskevin.buddhachat')
    expect(assetLinks('production')[0].target.sha256_cert_fingerprints).toHaveLength(2)
    expect(assetLinks('staging')[0].target).toMatchObject({ package_name: 'com.chriskevin.buddhachat.staging' })
  })
})
