# Masters H5 staging candidate

Must change: serve the independent Masters browser app at /masters and /masters/, with assets under /masters/assets/ and the content query locating the shared article/person/collection/video.

Must preserve: existing staging-specific videos/sutra/music/auth routing, download and APK APIs, social metadata catch-all, and the authenticated backend Production approval gate. Only staging may deploy automatically; main and all other branches stay disabled.

The source package in modules/masters-source contains 63 source/lock/runtime files with SHA256 identities. scripts/build-masters-h5.mjs verifies them, uses the existing H5 dependency lock, builds the public entry, and places it under dist/_masters. No local preview output is uploaded as a release source. Production must use a pushed canonical source commit through the existing backend workflow.

## Local evidence on latest staging baseline

Baseline: f5fee572b4391ae0acf90fb55cb1574ba25be583.

npm test: 230 existing Vitest cases plus source-integrity protection pass. npm run lint, npm run check:masters, npm run check:release-policy, and the complete npm run build pass. Existing routing configuration is unchanged except for the three Masters entries. The H5 browser artifact was also exercised separately in Chromium/WebKit mobile viewports for reading, controls, share gates and browser history; those checks do not replace actual native-device staging evidence.

## Remaining gates

Push the exact candidate, integrate with staging without discarding concurrent work, then verify the corresponding automatic deployment by SHA and deployment ID. Verify staged reading/playback/share paths on relevant devices. Account migration/RLS/synchronization still require the designated non-production Supabase project.

After staging verification, the owner must personally record acceptance in the authenticated BuddhaBloom admin workflow. Do not invoke or simulate Production promotion, change Production aliases, or treat chat assent as the backend approval record.

## Same-content App return candidate

Must change: staging preview App gates link to the canonical masters content route so a shared article returns to the same native article. Must preserve: browser reading and history, old App-home fallback for production/unconfigured builds, public routing and release approval policy. Only VERCEL_ENV=preview with VERCEL_GIT_COMMIT_REF=staging enables the new link.

Local validation: source integrity, lint, 230 Vitest tests and full build with those staging variables passed. Root H5 browser artifact tests passed in Chromium/WebKit with the flag enabled. Actual iOS Release system copy and Safari paste opened article xy-artcle69; Android system share contained the same URL. Online H5 return and both-platform lifecycle remain pending for this new candidate.
