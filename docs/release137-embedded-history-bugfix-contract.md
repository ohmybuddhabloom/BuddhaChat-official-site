# Release 1.3.7 embedded history bugfix contract

Date: 2026-09-29.

Must change: embedded onboarding must not write browser history during initial bootstrap, forward navigation, or explicit native-backed back navigation. Native back remains controlled by the existing back map, native persist request, ACK, and `setStep` sequence.

Must preserve: standalone web onboarding keeps browser history semantics, including initial `replaceState`, forward `pushState`, and reversible Back behavior. Embedded actions still wait for native ACK before changing steps, and bootstrap to `birthdate` or `wish_survey_2` must not auto-persist or advance without user input.

Affected paths: embedded welcome/email/back, embedded bootstrap resume into birthdate and wish-two, standalone web welcome-to-quests and web Back, and the existing `popstate` listener. This candidate does not change `popstate`; it only locks the current intended behavior with tests unless later device evidence requires a separate change.

Verification path for this local candidate: focused Vitest coverage for embedded and standalone navigation, plus lint. Android WebView `loadStart` behavior remains a device/runtime question for the parent release verification path.
