# BuddhaChat 下载中间页 Design QA

**Source visual truth**

- `/Users/kevin/Documents/BulletChat-official-site-yuanhui-campaign/evidence/app-download-selected-mobile-reference.png`
- `/Users/kevin/Documents/BulletChat-official-site-yuanhui-campaign/evidence/app-download-hero-background-v2.png`
- Source pixels: `722 × 2179`
- Generated standalone hero background: `1536 × 1024`

**Implementation evidence**

- Mobile first screen: `/Users/kevin/Documents/BulletChat-official-site-yuanhui-campaign/evidence/app-download-mobile-v2-390x844.png`
- Mobile long page: `/Users/kevin/Documents/BulletChat-official-site-yuanhui-campaign/evidence/app-download-mobile-v2-390x1200.png`
- Desktop: `/Users/kevin/Documents/BulletChat-official-site-yuanhui-campaign/evidence/app-download-desktop-v2-1280x720.png`
- Gallery after scroll: `/Users/kevin/Documents/BulletChat-official-site-yuanhui-campaign/evidence/app-download-gallery-v2-crop.png`
- Gallery after “下一张”: `/Users/kevin/Documents/BulletChat-official-site-yuanhui-campaign/evidence/app-download-gallery-next-v2-crop.png`

**Comparison setup**

- Primary CSS viewport: `390 × 844`
- Implementation density: `1×`
- Source normalization: scaled from `722 px` to `390 px` wide, then cropped to the same `390 × 844` first-screen region
- Side-by-side evidence: `/Users/kevin/Documents/BulletChat-official-site-yuanhui-campaign/evidence/app-download-mobile-comparison-v2.png`
- State: desktop/unrecognized user agent, `ch=yuanhui-poster-01`; all three applicable entrances visible, App Store active, unavailable Google Play and APK safely disabled

**Fidelity surfaces**

- Fonts and typography: the existing Chinese serif stack preserves the reference’s restrained Song-style hierarchy. Heading, support copy, button labels, wrapping, and optical weight are legible at 390 px.
- Spacing and layout rhythm: the brand header, hero, two value propositions, three download entrances, scroll cue, and partial gallery all fit within the first 844 px. The gallery continues as a native horizontal scroll-snap track.
- Colors and visual tokens: warm ivory, charcoal, muted gold, and low-contrast dividers track the selected reference and the existing site direction.
- Image quality and asset fidelity: the hero now uses a purpose-generated standalone `1536 × 1024` background with the Buddha, clouds, ivory paper, and negative space in one raster layer. Real app-preview captures remain unchanged. Visible book, heart, Apple, Google Play, and Android marks are raster assets taken from the selected reference rather than code-drawn substitutes.
- Copy and content: the implementation preserves the selected generic BuddhaChat message, including master-exclusive content and direct heart-to-heart communication with Buddha. It contains no Yuanhui-specific visible copy and no device-detection status.

**Comparison history**

1. Initial comparison found a `P2` asset mismatch: the two value propositions used simple border accents instead of the reference’s book and heart marks.
2. Fix: replaced those accents with source-faithful raster assets and recaptured the same `390 × 844` state.
3. Post-fix evidence: `app-download-mobile-comparison.png` shows the icons, hierarchy, first-screen button placement, and partial gallery aligned with the selected reference.
4. User review found a `P1` hierarchy issue: the Buddha was still rendered as a separate rectangular image instead of a background beneath the content layer.
5. User review also found `P2` gallery issues: preview cards felt oversized, horizontal switching was not explicit, and cards had no short explanatory copy.
6. Fix: generated and installed a standalone hero background, removed the separate Buddha element, added a translucent content overlay, reduced preview-card scale, added real previous/next controls, and added a concise title and explanation to every preview.
7. Post-fix evidence: `app-download-mobile-comparison-v2.png`, `app-download-gallery-v2-crop.png`, and `app-download-gallery-next-v2-crop.png`.

**Findings**

- No actionable `P0`, `P1`, or `P2` differences remain.
- `P3`: the reference’s decorative right arrows are omitted. The full-width buttons remain unambiguous and keyboard-focusable; adding arrows is optional polish once approved platform badge assets are available.
- Intentional constraint: Google Play and APK appear disabled until real production URLs exist. Showing them as active would create broken or unsafe downloads.

**Interaction and browser verification**

- App Store entrance resolves to the confirmed App Store URL.
- Google Play and APK are not exposed as links while their environment URLs are absent.
- “继续下滑” moves to the app-preview section.
- Touch/trackpad scrolling remains native, and the explicit “上一张 / 下一张” controls advance the carousel. “下一张” was exercised in the browser and moved from the first app capture to the Q&A capture.
- Direct implementation tab showed no browser console errors.
- Desktop response was checked at `1280 × 720`.

**Focused-region comparison**

- A separate crop was not needed: the normalized `390 × 844` side-by-side comparison keeps hero type, value icons, all three button states, and the gallery transition readable at 1:1.

final result: passed

## V3：整张 Hero 背景与标准手机框

用户复查发现 V2 的佛像图片只覆盖介绍区，和页面底色形成“背景里再套背景”的色块；产品预览仍像长截图卡片，不像真实 APP 运行在手机中。

V3 修订：

- Hero 外层直接使用一张完整背景，品牌、文案、价值点、三个下载入口全部叠在同一张图上。
- 手机使用 `1024×1536` 竖版背景；桌面使用 `1536×1024` 横版背景。
- 两张背景从边到边使用官网 `#eadccf` 暖灰米色，不包含内嵌底板、文字、Logo、按钮或 APP UI。
- 介绍区不再设置任何第二背景或蒙层。
- 产品预览改为 `9:19.5` 标准手机外框，真实长截图在屏幕区域内自然裁切，并保留横向滑动。

V3 证据：

- 移动首屏：`evidence/app-download-mobile-v3-390x844.png`
- 移动产品区：`evidence/app-download-gallery-phone-v3-390x844.png`
- 桌面首屏：`evidence/app-download-desktop-v3-1280x720.png`
- 竖版背景：`public/buddhachat-download-hero-mobile-v3.jpg`
- 横版背景：`public/buddhachat-download-hero-desktop-v3.jpg`

尺寸与运行结果：

- `390×844` 下三个下载入口 bottom 分别为 `438 / 510 / 582px`，全部完整处于首屏。
- 移动手机框为 `260×563px`；桌面手机框为 `252×546px`。
- Hero 计算样式只引用对应 V3 背景；介绍区 `background-image: none`。
- 页面控制台错误为 0。
- 全量测试 97/97、production build 通过；ESLint 0 error，保留 2 个既有 warning。

final result: passed
