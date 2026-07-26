# BuddhaChat 下载页 V4 Design QA

## Comparison target

- Source visual truth: `evidence/app-download-mobile-v3-390x844.png`
- Approved content change: five APP advantages confirmed by the user in the 2026-07-26 download-page task
- Implementation screenshot: `evidence/app-download-mobile-v4-five-values-390x844.png`
- Desktop implementation screenshot: `evidence/app-download-desktop-v4-five-values-1280x720.png`
- Full-view comparison: `evidence/app-download-mobile-v4-design-qa-comparison.png`
- Focused hero comparison: `evidence/app-download-mobile-v4-design-qa-hero-focus.png`

## Capture normalization

- Mobile CSS viewport: `390 × 844`, `devicePixelRatio: 1`
- Mobile source and implementation captures: both `375 × 812` pixels after the in-app browser chrome crop
- Desktop CSS viewport: `1280 × 720`, `devicePixelRatio: 1`
- Desktop capture: `1265 × 712` pixels after the in-app browser chrome crop
- State: computer/unknown platform, so all three download entries are visible

## Findings

- No remaining P0, P1, or P2 mismatch.
- Fonts and typography: the original Songti/system-serif hierarchy is preserved. Five headings remain stronger than their descriptions and do not collide with the Buddha.
- Spacing and layout rhythm: the original hero, background crop, right-side Buddha, gallery reveal, and page margins are preserved. App Store remains the main row; Google Play and the Android installer share the compact second row.
- Colors and visual tokens: the original warm paper, ink, restrained gold, disabled-entry treatment, and dark App Store action are unchanged.
- Image quality and asset fidelity: the existing production hero and store icon assets are reused without replacement, stretching, or new generated imagery.
- Copy and content: all five approved advantages are present. `Android APK 下载` is replaced with `安卓安装包`.
- Responsiveness: the three computer/unknown download entries and the start of the APP gallery remain visible within the `390 × 844` first screen. The `1280 × 720` layout keeps values left, Buddha right, and actions below.
- Interaction: the existing next control moved the horizontal gallery from `scrollLeft: 0` to `295`; no browser console errors or warnings were observed.

## Comparison history

1. First pass found one P2 readability issue: mobile supporting copy used `0.66rem`, too small for the older audience implied by the installer-label change.
2. Fixed the value headings to `0.82rem` and supporting copy to `0.72rem`.
3. Recaptured the same `390 × 844` state. All five items, the Buddha, all three entries, and the gallery reveal remain visible with no overlap.

## Follow-up polish

- None required for this scoped change.

final result: passed
