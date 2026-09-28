# Release 1.3.7 App Onboarding H5 Locale Contract

## Must change

- `/app/onboarding/v1?embedded=1` must render the new H5 onboarding copy in the locale supplied by the native bootstrap for `en`, `zh-Hans`, and `zh-Hant`.
- The locale switch must cover visible controls, option labels, validation errors, bridge fallback errors, progress text, loading states, image alt text, and screen-reader announcements.

## Must preserve

- Native IDs remain stable: option IDs, guardian IDs, step IDs, and bridge event payloads are not translated.
- Embedded mode keeps native as the authority for submitted answers and clears H5 localStorage drafts.
- Bridge ACK ordering, guardian resolution, first-practice completion, auth/account isolation, guest exploration, legal external navigation, and completed-user resume behavior stay unchanged.

## Verification

- Focused Vitest coverage must prove English and Traditional Chinese render through the bootstrap locale while stable native IDs are still submitted.
- Source verification closes only the local implementation gate; hosted staging and exact Android/iOS Release evidence remain required before this replacement is complete.

## Local results

Focused page and locale tests: 71 passed. The added locale matrix renders 13 English bootstrap states, verifies accessible copy has no untranslated Chinese, and exercises English/Traditional native-error retry without leaking provider messages or writing embedded completion state. Running these 16 new cases against the pre-change page produced 15 failures / 1 pass; restoring the new page byte-for-byte produced 16 passes. All three dictionaries have the same field/formatter shape. Scoped ESLint passed. The implementation helper also ran the existing site suite (232 tests) and full lint successfully before the additional 16 tests were added.

No package build or deployment was performed. DOM tests do not prove native WebView layout, keyboard or lifecycle behavior; these remain in the consolidated Android/iOS acceptance gate.
