# Masters H5 entry change contract

Must change: serve the independent Masters browser app at /masters and /masters/, with scripts and styles under /masters/assets/. Preserve the content query identifying the shared article/person/collection/video.

Must preserve: existing download, APK, guide, Yuanhui, videos, sutra, music, auth and catch-all routing; manual Git deployment policy stays disabled.

Candidate packaging: the official build must provide _masters/index.html and _masters/assets from the browser H5 source, not the device-frame review build. Source must be pinned to a pushed canonical commit and built by the release workflow. Local dist-public is validation evidence only, not a Production upload artifact.

Verification: route configuration checks, full existing official test/lint/build, designated staging exact SHA, iOS and Android browser/App share entry and back/close. Do not deploy this route-only patch until source packaging and all required checks are ready.

Current status: route preparation only. No upstream hostname invented. No commit/push/deployment made. Browser H5 source currently lives in the RN workspace; canonical source packaging remains to be connected.

## Local candidate verification (2026-09-11)

The source package is now connected through scripts/build-masters-h5.mjs. Its 63-file SHA256 manifest is validated before using the existing H5 lockfile and build:public command. Full official npm run build succeeded, including dist/_masters and the unchanged spa output preparation. The ten generated H5 files match the independently tested public artifact byte for byte.

npm test passed all 159 existing Vitest cases plus the new source-integrity check; npm run lint and npm run check:masters passed. ESLint excludes nested generated dist-public output and recognizes existing server API/master-router files as Node; no runtime API code or rule severity changed. The standalone H5 artifact was separately tested on Chromium and WebKit mobile viewports. These are local checks, not staging or native-device evidence.

Remaining release gates: canonical pushed candidate, designated staging deployment and route/read/play/share checks, real iOS/Android Release integration, non-production account migration/RLS/account synchronization evidence, and explicit Production promotion authorization. No Production, download artifact, or database mutation performed.
