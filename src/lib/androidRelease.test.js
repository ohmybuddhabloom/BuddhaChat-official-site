import { describe, expect, it } from 'vitest'
import { fetchAndroidRelease } from './androidRelease.js'

const release = {
  platform: 'android',
  packageName: 'com.chriskevin.buddhachat',
  versionCode: 11,
  versionName: '1.3.1',
  apkUrl: 'https://www.buddhachat.online/downloads/android/latest.apk',
}

describe('fetchAndroidRelease', () => {
  it('accepts a valid official Android release', async () => {
    await expect(fetchAndroidRelease(async () => ({ ok: true, json: async () => release }))).resolves.toEqual(release)
  })

  it('rejects an invalid release without exposing it as a download', async () => {
    await expect(fetchAndroidRelease(async () => ({ ok: true, json: async () => ({ ...release, versionCode: 0 }) }))).rejects.toThrow('invalid')
  })
})
