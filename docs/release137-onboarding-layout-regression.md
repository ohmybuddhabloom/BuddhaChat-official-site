# Release 1.3.7 onboarding layout repair

Contract: keep existing three-locale copy, native actions, guardian answers, completion and legal destinations; make welcome actions/terms reachable at every height, and show the zen tip text only once. Both iOS and Android Release WebViews remain required; local browser results are not final release signoff.

The original artwork includes English lettering in its right half. The card now clips the decorative bitmap to its left landscape (42.6% of source width), hides that decorative image from accessibility, and lays out one localized text block beside it. The source image is unchanged. Card content can grow with translated copy.

The welcome screen now allows vertical scrolling outside the existing <=720px media rule as well. A local 375x760 English test failed with the fix removed (terms below the viewport and overflow:hidden), then passed with the fix restored. At 375x647 the old stylesheet already allowed scrolling; the earlier iOS SE gesture observation still needs exact WKWebView rechecking, and is not proven resolved by this CSS change.

Regression fixture and instructions: tests/fixtures/onboarding-layout.html and README.md. Six locale/height welcome checks pass (en/zh-Hans/zh-Hant × 647/760), three landscape text-exclusion checks pass. Actual wheel scrolling reaches Privacy Policy; guest button emits guest.explore in the local fixture. Three new accessibility/localization tests fail before the decorative separation and pass afterwards. Focused tests: 74; full Vitest suite: 251; lint: pass. Native implementation's loading issue is separate and still under concentrated repair. No new native build or deployment in this work.
