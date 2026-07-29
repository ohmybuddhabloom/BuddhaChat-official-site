import { describe, expect, it } from 'vitest'
import { fetchAndroidRelease } from './androidRelease.js'

const release = {
  platform: 'android',
  packageName: 'com.chriskevin.buddhachat',
  versionCode: 11,
  versionName: '1.3.1',
  apkUrl: 'https://www.buddhachat.online/downloads/android/latest.apk',
  sha256: '6ad581837eb6eea256da117af980b7c56d101098d935a255bf10859217896796',
}

describe('fetchAndroidRelease', () => {
  it('accepts a valid official Android release', async () => {
    await expect(fetchAndroidRelease(async () => ({ ok: true, json: async () => release }))).resolves.toEqual(release)
  })

  it('rejects an invalid release without exposing it as a download', async () => {
    await expect(fetchAndroidRelease(async () => ({ ok: true, json: async () => ({ ...release, versionCode: 0 }) }))).rejects.toThrow('invalid')
    await expect(fetchAndroidRelease(async () => ({ ok: true, json: async () => ({ ...release, sha256: 'invalid' }) }))).rejects.toThrow('invalid')
  })
})
