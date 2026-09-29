# Release 1.3.7 welcome scroll bugfix contract

Date: 2026-09-29.

Must change: on a small iOS WKWebView viewport, embedded English welcome after returning from the overview step must allow the four native-capability actions and the legal links to become reachable by user scrolling.

Must preserve: three-locale welcome copy, email/Apple/Google/guest action availability, native ACK ordering, legal external navigation, overview/native-back behavior, answer IDs and payload persistence, standard onboarding page scrolling, and existing animation timing.

Affected paths: embedded welcome, embedded quests/overview native Back to welcome, and the local onboarding layout fixture. Adjacent paths to preserve are email entry, guest entry, native sign-in actions, legal links, and standard survey screens using `.onboarding-screen__scroll`.

Verification path for this local candidate: focused Vitest coverage for welcome/back controls and localized onboarding behavior, the layout fixture's executable welcome and back-to-welcome viewport checks, and lint. Exact iOS/Android Release WebView evidence remains required before closing the release blocker.
