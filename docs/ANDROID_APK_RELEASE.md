# Android APK Release

The public download button always uses:

`https://www.buddhachat.online/downloads/android/latest.apk`

Vercel routes that stable URL through `api/android-apk`, which redirects to the environment-specific
`ANDROID_APK_URL`. Production and staging must set that URL separately so APK delivery changes pass
through staging before production. The legacy `/download/android/latest.apk` entry remains as a
compatibility alias and uses the same API route.

The old Tencent Cloud Nginx `music.buddhachat.online` APK URLs must stay reachable for at least
14 days after a CDN migration, so already-started downloads, cached links, and rollback checks keep
working. Every release is also retained under `apk/releases/`.

## Publish A New APK

Use an APK signed with the BuddhaChat Android upload key, then run:

```sh
npm run publish:android-apk -- /absolute/path/BuddhaChat-x.y.z-code.apk
```

The script verifies the production package name and signing certificate before uploading. It
then writes both the immutable versioned object and the stable `latest` object. No website code
or Vercel deployment is needed for later APK updates.

Direct APK installs use the upload-key signature. Google Play installs use Google's app-signing
certificate, so users must uninstall before switching between those two distribution channels.
