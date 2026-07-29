const APK_HOST = 'www.buddhachat.online'

export default function handler(req, res) {
  const apkUrl = process.env.ANDROID_APK_URL?.trim()
  if (!apkUrl) return res.status(503).json({ error: 'Android APK is not configured.' })
  try {
    const parsed = new URL(apkUrl)
    if (parsed.protocol !== 'https:' || parsed.hostname === APK_HOST) {
      return res.status(503).json({ error: 'Android APK URL is invalid.' })
    }
  } catch {
    return res.status(503).json({ error: 'Android APK URL is invalid.' })
  }
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  return res.redirect(302, apkUrl)
}
