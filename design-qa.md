# BuddhaChat 下载页 V6 Design QA

## Comparison target

- Source visual truth: `/Users/kevin/Documents/h5 中间页/.scratch/h5-middle-page/download-v6-airy-visual/buddhachat-download-v6-option-1.png`
- Source pixels: `813 × 1934`
- Mobile implementation: `/Users/kevin/Documents/BulletChat-official-site-yuanhui-campaign/evidence/app-download-v6-release-mobile-390x844.png`
- Mobile capture pixels: `390 × 844`
- Desktop implementation: `/Users/kevin/Documents/BulletChat-official-site-yuanhui-campaign/evidence/app-download-v6-release-desktop-1280x720.png`
- Desktop capture pixels: `1280 × 720`
- Gallery implementation: `/Users/kevin/Documents/BulletChat-official-site-yuanhui-campaign/evidence/app-download-v6-release-gallery-390x844.png`
- Browser: Codex in-app Browser
- Density: `devicePixelRatio = 1`
- State: desktop/unknown device state，三个下载入口同时显示；Google Play 与安卓安装包保留真实未配置禁用态。
- Density normalization: source visual scaled to `390px` content width, then cropped to `390 × 844`; implementation captured at the same `390px` page-content width.

## Evidence

- Full-view comparison: `/Users/kevin/Documents/BulletChat-official-site-yuanhui-campaign/evidence/app-download-v6-release-comparison-mobile.png`
- Focused gallery comparison: `/Users/kevin/Documents/BulletChat-official-site-yuanhui-campaign/evidence/app-download-v6-release-comparison-gallery.png`
- Primary interaction: “下一张”将预览轨道 `scrollLeft` 从 `20` 移至 `403`。
- Console: mobile and desktop local production preview均为 `0 error / 0 warning`。

## Required fidelity surfaces

- Fonts and typography: 继续使用现有 `Noto Serif SC / Songti SC / STSong` 字体栈；标题保持两行，五项优势层级与方案一一致，无截断。
- Spacing and layout rhythm: 首屏改为“两项核心优势 + 三项能力带”；`390 × 844` 与 `360 × 800` 均完整显示三个下载入口，并露出下方产品展示开头。
- Colors and visual tokens: 继续复用官网暖米色、墨色与克制金色线条；没有新增第二块背景、重阴影或突兀蒙层。
- Image quality and asset fidelity: 佛像继续使用现有完整背景资产；三项能力图标来自选定视觉稿；三张产品预览均使用真实 APP 截图和标准手机外框。
- Copy and content: 五项优势、三个下载入口以及“持续修行 / 与大师沟通 / AI 佛祖对话”均与确认范围一致。

## Comparison history

1. First pass
   - P2: 手机标题被挤成三行，偏离方案一。
   - P2: 首屏下方没有露出产品展示。
   - P2: `1280 × 720` 桌面首屏下载入口落到折叠线以下。
   - Fix: 收紧标题字号和宽度，上移佛像背景，压缩 intro 空白与 gallery 顶部间距，并单独校准桌面 hero 节奏。

2. Second pass
   - P2: 产品展示标题在手机上发生不自然换行。
   - Fix: 标题收敛为“探索 BuddhaChat”，同时缩小上一张/下一张控制尺寸。

3. Final pass
   - Post-fix evidence: `app-download-v6-release-comparison-mobile.png` 与 `app-download-v6-release-comparison-gallery.png`。
   - No actionable P0/P1/P2 findings remain.

## Accepted differences

- 视觉稿在一张静态图中同时露出三台手机；真实页面为了保证截图可读性，首屏露出约一台半，并通过原生触控横滑和显式按钮查看其余页面。
- Google Play 与安卓安装包增加“下载地址配置中”，这是当前真实 URL 未配置时的安全状态，不使用视觉稿中的假可用状态。
- 页眉保留现有“官方网站”入口和站点字标，避免为本轮局部重排改动全站品牌导航。

## Follow-up polish

- P3: 若以后取得正式品牌莲花锁定标，可替换当前纯文字字标；本轮不新增未经确认的 Logo 资产。

final result: passed
