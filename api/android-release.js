const APK_HOST = 'www.buddhachat.online'
const SHA256 = /^[a-f0-9]{64}$/i

function integer(value, fallback = 0) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback
}

function notes(value) {
  if (!value) return []
  return value.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 8)
}

export default function handler(req, res) {
  const versionCode = integer(process.env.ANDROID_APK_VERSION_CODE)
  const versionName = process.env.ANDROID_APK_VERSION_NAME?.trim()
  const sha256 = process.env.ANDROID_APK_SHA256?.trim()
  if (!versionCode || !versionName || !SHA256.test(sha256 ?? '')) {
    return res.status(503).json({ error: 'Android release is not configured.' })
  }

  const apkUrl = `https://${APK_HOST}/downloads/android/latest.apk`
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  return res.status(200).json({
    platform: 'android',
    packageName: 'com.chriskevin.buddhachat',
    versionCode,
    versionName,
    minSupportedVersionCode: integer(process.env.ANDROID_APK_MIN_SUPPORTED_VERSION_CODE),
    apkUrl,
    sha256: sha256.toLowerCase(),
    publishedAt: process.env.ANDROID_APK_PUBLISHED_AT ?? new Date().toISOString(),
    notes: {
      'zh-Hans': notes(process.env.ANDROID_APK_RELEASE_NOTES_ZH_HANS),
      'zh-Hant': notes(process.env.ANDROID_APK_RELEASE_NOTES_ZH_HANT),
      en: notes(process.env.ANDROID_APK_RELEASE_NOTES_EN),
    },
  })
}
