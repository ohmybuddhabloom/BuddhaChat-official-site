const ENDPOINT = '/downloads/android/latest.json'

function isRelease(value) {
  if (!value || typeof value !== 'object') return false
  return value.platform === 'android'
    && value.packageName === 'com.chriskevin.buddhachat'
    && Number.isSafeInteger(value.versionCode)
    && value.versionCode > 0
    && typeof value.versionName === 'string'
    && typeof value.apkUrl === 'string'
}

export async function fetchAndroidRelease(fetchImpl = fetch) {
  const response = await fetchImpl(ENDPOINT, { cache: 'no-store' })
  if (!response.ok) throw new Error('Android release is unavailable.')
  const release = await response.json()
  if (!isRelease(release)) throw new Error('Android release is invalid.')
  return release
}
