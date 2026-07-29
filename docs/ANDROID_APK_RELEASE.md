# Android APK Release

The public download button always uses:

`https://www.buddhachat.online/download/android/latest.apk`

Vercel redirects that stable URL to the no-cache `BuddhaChat-latest.apk` object served through
the Tencent Cloud Nginx endpoint. Every release is also retained under `apk/releases/`.

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
