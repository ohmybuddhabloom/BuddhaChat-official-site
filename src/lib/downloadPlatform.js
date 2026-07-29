export function detectDownloadPlatform(device = globalThis.navigator) {
  const userAgent = device?.userAgent ?? ''
  const platform = device?.platform ?? ''
  const touchPoints = device?.maxTouchPoints ?? 0

  if (/iPhone|iPad|iPod/i.test(userAgent) || (platform === 'MacIntel' && touchPoints > 1)) {
    return 'ios'
  }

  if (/Android/i.test(userAgent)) {
    return 'android'
  }

  return 'other'
}

export function isWeChatBrowser(device = globalThis.navigator) {
  return /MicroMessenger/i.test(device?.userAgent ?? '')
}
