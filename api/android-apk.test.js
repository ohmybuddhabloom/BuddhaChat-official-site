import { afterEach, describe, expect, it } from 'vitest'
import handler from './android-apk.js'

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
    redirect(code, location) {
      this.statusCode = code
      this.location = location
      return this
    },
  }
}

describe('android APK endpoint', () => {
  it('redirects to the configured external APK URL without caching the decision', () => {
    process.env.ANDROID_APK_URL = 'https://download-cdn.buddhachat.online/apk/releases/BuddhaChat-1.3.5-17.apk'

    const res = response()
    handler({}, res)

    expect(res.statusCode).toBe(302)
    expect(res.location).toBe(process.env.ANDROID_APK_URL)
    expect(res.headers['Cache-Control']).toBe('no-store, max-age=0')
  })

  it('rejects missing, non-HTTPS, and same-host APK targets', () => {
    for (const apkUrl of [
      undefined,
      'http://download-cdn.buddhachat.online/apk/latest.apk',
      'https://www.buddhachat.online/downloads/android/latest.apk',
      'not a url',
    ]) {
      if (apkUrl === undefined) {
        delete process.env.ANDROID_APK_URL
      } else {
        process.env.ANDROID_APK_URL = apkUrl
      }

      const res = response()
      handler({}, res)

      expect(res.statusCode).toBe(503)
    }
  })
})
