# Yin Shun staging visibility

The requested goal is to make 印顺老和尚 discoverable and readable in the existing staging Masters H5 at https://staging.buddhachat.online/masters/.

The preview-only build flag `VITE_MASTERS_YINSHUN_STAGING_VISIBLE` is set by the existing build script only for the `staging` Git branch in the Vercel preview environment. The runtime overlay also requires the exact HTTPS Supabase origin `bjswjgadnariutxibsfh.supabase.co`. Default/production builds and other database targets retain the existing visibility. Canonical people and native discovery remain unchanged. No production environment or database is modified.

Must change: show the subject in home, directory and search; render the authorized official photograph; open existing 44 works and 489 reviewed sections. Must preserve: all existing author/content IDs, versions, attribution, figures, personal records, old authors/readers, back navigation and media behavior.

The original photograph is copied without image edits from https://www.yinshun.org.tw/images/carousel1.jpg, published by 印顺文教基金会. SHA-256: `daa9cb6721dba867e28f22e2663b981e4c006d2c10ae5dec4a77e7ce365ff8dd`; 1900 × 800 JPEG. The user confirmed portrait authorization on 2026-10-09 with “肖像取得授权了”. The public source credit appears on the profile. Display cropping positions the existing photograph; no generated portrait is used.

The video tab continues to state that verified personal media has not been collected. This staging text preview does not certify video attribution/playback or native release acceptance.

Validation: 266 official tests, six Masters source/app-return/discovery checks, lint, source hash verification and the full staging build passed. Discovery behavior rejects missing/false flags, production or unrelated database hosts, HTTP, credentials, query/hash and unrelated paths. It preserves canonical objects and every other author. Mobile viewport artifact/hosted evidence is recorded separately.

Both native iOS and Android exact Release acceptance remain pending; WebKit is not installed in this executor. Chromium iPhone viewport checks are reported as Chromium checks, not Safari/iOS acceptance. No APK, OTA or native release is part of this change.
