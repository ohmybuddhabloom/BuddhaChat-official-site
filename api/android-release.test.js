import { afterEach, describe, expect, it } from 'vitest'
import handler from './android-release.js'

const original = { ...process.env }

afterEach(() => {
  process.env = { ...original }
})

function response() {
  return {
    headers: {},
    setHeader(key, value) { this.headers[key] = value },
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return this },
  }
}

describe('android release endpoint', () => {
  it('only publishes a complete, verified release contract', () => {
    Object.assign(process.env, {
      ANDROID_APK_VERSION_CODE: '11',
      ANDROID_APK_VERSION_NAME: '1.3.1',
      ANDROID_APK_SHA256: 'a'.repeat(64),
      ANDROID_APK_MIN_SUPPORTED_VERSION_CODE: '9',
    })
    const res = response()
    handler({}, res)
    expect(res.statusCode).toBe(200)
    expect(res.payload.apkUrl).toBe('https://www.buddhachat.online/downloads/android/latest.apk')
    expect(res.payload.versionCode).toBe(11)
  })

  it('does not expose a partially configured APK release', () => {
    delete process.env.ANDROID_APK_VERSION_CODE
    const res = response()
    handler({}, res)
    expect(res.statusCode).toBe(503)
  })
})
