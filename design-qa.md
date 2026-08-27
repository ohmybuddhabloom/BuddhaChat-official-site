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

---

# APP 12 屏 H5 引导流程核对

- 目标：以原 APP 的流程、素材和暖白金视觉体系实现完整 12 屏 H5 引导。
- 路由：`/app/onboarding/v1`
- 视口：Chrome 390×844。
- Android API 35 全流程证据：`/Users/kevin/Documents/codex_screenshots/onboarding_h5_integration_20260812/`。
- 结果：通过。12 屏无横向溢出，页面刷新可恢复当前步骤，浏览器返回与页内返回均能回到正确前序。
- 交互：心愿和陪伴方式为必选；生日默认 1990-06-01 且要求年满 13 岁；三段仪式按 3 秒 / 4.2 秒 / 3 秒自动过渡；7 位守护佛按心愿动态匹配；首次修行支持开始、暂停、继续和 30 秒完成。
- 登录：邮箱分邮箱与 6 位验证码两阶段，复用官网既有登录接口，并保留 60 秒重发倒计时与错误态。
- 动效：复用 MengTo `animation-systems`、`ambient-section-particles` 和 `masked-reveal` 的方法；只使用 CSS 与少量 DOM 光尘，没有新增 Three.js 或动画依赖，并支持 `prefers-reduced-motion`。
- 验证：页面、路由与登录专项 64 条通过，全仓 207 条通过；生产构建通过；Android API 35 上完整走过 12 屏、30 秒练习、完成后 Home、冷启保持、游客 Ask 门禁、邮箱返回与 Google 取消回退。
- APP 嵌入态：所有登录、进度、守护佛、完成和 Ask/Home 跳转都通过版本化 bridge 交给原生真相层，收到 ACK 后才前进；独立浏览器仍保留网页内完成页。

## 2026-08-12 动效与适配复盘

- Skill 约束：使用 Ponytail、TDD、Accessibility、MengTo `animation-systems` / `ambient-section-particles` / `masked-reveal` 与完成前验证；不引入 Three.js 或新动画依赖。
- 视觉节奏：冲击力集中在欢迎、佛的临在、祝福汇聚、守护佛揭晓四页；其余表单页保持克制，共鸣页仅增加当前项光扫。
- 适配修复：补 `viewport-fit=cover`、安全区、44px 触控区、16px iOS 表单字号、系统鼠标，并将短屏/横屏的 Presence、Blessing、Guardian 改为可滚动可达。
- 性能：`/app/onboarding/v1` 只预载欢迎图，不再预载首页 poster、scene.json 和远程字体。
- 无障碍：进度条提供真实 `progressbar` 语义，换页后重置滚动并将焦点送到新标题；首次打开不抢占焦点；`prefers-reduced-motion` 下停止非必要动效但保留 3s / 4.2s / 3s 阅读时长。
- 浏览器矩阵：`320×568`、`375×667`、`390×844`、`430×932`、`768×1024`、`844×390`均无横向溢出；横屏邮箱页与守护佛页底部操作可通过页内滚动完整到达。
- 验证：48 条 onboarding 页面专项与 64 条路由/登录相关测试通过；全仓 207 条通过；`npx eslint src`、`git diff --check`、生产构建通过。
