# Onboarding layout regression fixture

Run the existing Vite dev server. Open `/tests/fixtures/onboarding-layout.html?embedded=1&locale=en`
with a 375×647 and 375×760 viewport; repeat with `zh-Hans` and `zh-Hant`.
The fixture uses the production React page and global/page styles, with a local fake native bridge.
It never authenticates or persists data. It is outside Vite's production entry graph.

Click **Check layout** and read `document.body.dataset.layoutResult`. On welcome,
`guestReachable`, `legalReachable`, and `welcomeBottomClearance` must be true, and `horizontalOverflow` false.
The check only scrolls the dedicated welcome user-scrollable container (auto/scroll), and it
requires controls to intersect the real viewport, so overflow-hidden ancestors cannot falsely pass
through programmatic scrolling. Also scroll manually from the hero to the final
Privacy Policy link and click the guest button; `data-last-native-action` becomes `guest.explore`.
Wait for entry animations to settle before taking screenshots.

Add `&step=quests&scenario=overview-back-welcome` to execute the embedded overview Back path,
then check welcome reachability after the fake native ACK returns to welcome. `activeStep` must be
`welcome`, and `guestReachable` / `legalReachable` / `welcomeBottomClearance` must be true at 375×647 and 375×760.

Add `&step=quests` to check the card. `artworkTextExcluded` must be true: the displayed
image region must be no more than the original bitmap's left 44%, excluding its baked English.
Visually confirm the mountain/lotus remains and only one localized tip is visible.
The welcome check does not evaluate artwork, and the quests check does not evaluate welcome controls.

Run `npx vitest run src/pages/AppOnboardingLocales.test.jsx src/pages/AppOnboardingWelcomePage.test.jsx`
for localized copy, decorative accessibility and bridge/action protection. Browser fixture evidence
supplements these tests; neither replaces exact iOS/Android Release WebView acceptance.
