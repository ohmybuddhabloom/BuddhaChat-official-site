// 1.4.5 任务8: the App (from the 1.4.5 shell) opens www share pages directly. These are the files iOS
// and Android read to trust www for the App: only /s/* (not its card and poster images) and /lamp/*.
// /join/* stays with the web page while Community is hidden (Owner 11-27).
import { getPublicOrigin, PUBLIC_ORIGINS } from './_lib/public-origin.js'

const APPS = {
  production: {
    appID: 'V85365UK7R.com.chriskevin.buddhachat-rn-expo-claude-to-codex',
    androidPackage: 'com.chriskevin.buddhachat',
    // Google Play signing and the website APK, the same as go.buddhachat.online.
    fingerprints: [
      'DC:C4:3D:15:35:37:36:B5:50:7A:E7:A7:97:C5:F9:5D:CC:2B:03:A5:20:8E:E0:21:35:BA:ED:EB:1C:4F:DE:BD',
      '46:8F:68:BA:B7:50:04:F2:0C:8C:43:2A:0F:9E:5B:25:B6:E7:97:F7:B2:6B:B1:7F:FF:41:36:04:C5:5D:80:46',
    ],
  },
  staging: {
    appID: 'V85365UK7R.com.chriskevin.buddhachat-rn-expo-claude-to-codex.staging',
    androidPackage: 'com.chriskevin.buddhachat.staging',
    fingerprints: ['B1:FA:F4:22:17:3C:D4:22:08:6E:85:79:2B:AF:B3:29:47:DF:56:3F:6A:81:15:07:E1:24:C3:23:34:D2:65:93'],
  },
}

export function appleAppSiteAssociation(environment) {
  const app = APPS[environment] ?? APPS.production
  return {
    applinks: {
      apps: [],
      details: [{
        appID: app.appID,
        components: [
          { '/': '/s/*/*/card.jpg', exclude: true, comment: 'Share card image' },
          { '/': '/s/*/*/poster.png', exclude: true, comment: 'Share poster image' },
          { '/': '/s/*', comment: 'Share pages (1.4.5)' },
          { '/': '/lamp/*', comment: '传灯 letters' },
        ],
      }],
    },
  }
}

export function assetLinks(environment) {
  const app = APPS[environment] ?? APPS.production
  return [{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: app.androidPackage, sha256_cert_fingerprints: app.fingerprints },
  }]
}

export default function handler(req, res) {
  const url = new URL(req.url, PUBLIC_ORIGINS.production)
  const environment = getPublicOrigin(req) === PUBLIC_ORIGINS.staging ? 'staging' : 'production'
  const file = url.searchParams.get('file')
  const body = file === 'assetlinks' ? assetLinks(environment) : file === 'aasa' ? appleAppSiteAssociation(environment) : null
  if (!body) {
    res.statusCode = 404
    res.end()
    return
  }
  res.statusCode = 200
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'public, max-age=3600, s-maxage=3600')
  res.end(JSON.stringify(body))
}
