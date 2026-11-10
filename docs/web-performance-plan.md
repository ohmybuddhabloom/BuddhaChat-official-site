# BuddhaChat 网页端性能与规范整改方案

- 编写日期：2026-11-10
- 范围：官网 `BuddhaChat-official-site`、视频站 `h5-zentube`（挂在官网 `/videos`）、佛典 `buddhachat-sutra-reader`、佛乐 `buddhachat-music`、后台 `buddhabloom-admin`
- 依据：五个仓库 `staging` 分支最新代码（官网 `8d8d9a4`、视频站 `80b2db9`、佛典 `b0d3824`、佛乐 `0568520`、后台 `03d4770`），以及线上站点的实测数据
- 状态说明：**已完成**表示代码已在本仓库分支里改好并通过验证；**待做**表示只有方案

---

## 0. 怎么测、怎么复测

所有数字都可以用同一套脚本复测，脚本放在会话临时目录的 `tools/` 下，需要时可以搬进仓库的 `scripts/perf/`：

| 脚本 | 用途 |
|---|---|
| `harness.mjs <构建目录> <端口> <结果文件> [限速Mbps]` | 本地静态服务器：支持视频分段请求，给页面自动注入测量脚本，接收结果回传；可以限速模拟 4G |
| `probe.js` | 页面内测量：在佛像区间（0→700px）匀速往下、再往上各滚 3 秒，统计每帧间隔、丢帧、长动画帧，以及**佛像每秒实际刷新次数**（旧版用 `requestVideoFrameCallback` 统计视频真正呈现的帧，新版统计画布绘制次数） |
| `chromium-run.mjs` / `ab-chromium.sh` | 有界面 Chromium（开显卡加速），同一条件下对比改前和改后 |
| `weight.mjs` | 模拟 4G 手机（9Mbps、往返 150ms、CPU 降速 4 倍）测线上页面的传输体积、最大内容出现时间（LCP）、布局偏移（CLS）、主线程阻塞时长 |
| `imgs.mjs` | 列出页面每张图片的原图尺寸、显示尺寸和体积 |

注意事项（都踩过）：

1. **不要用无界面浏览器判断卡顿。** 它没有显卡，绘制和合成都是软件模拟，帧率波动很大。
2. 测之前先看 mini 的负载（`uptime`）。持续集成满载时 1 分钟负载可以到 100，两个版本都会出现几百毫秒的假卡顿。负载降到 6 以下再测。
3. 首页开了平滑滚动（`scroll-behavior: smooth`），测量脚本必须先关掉它，否则 `scrollTo` 自带动画，数据会失真。
4. Safari 自动化要先在 Safari 设置里打开"允许远程自动化"，并执行 `sudo safaridriver --enable`。不想开的话，可以直接用 `open -a Safari "<地址>?probe=1"`，或者在 iOS 模拟器里用 `xcrun simctl openurl`，页面会自己滚动、自己回传结果，不需要远程控制权限。
5. 安卓模拟器在 mini 上用的是软件渲染（swiftshader），不能代表真机的滚动表现。

---

## 1. 官网首页佛像滚动卡顿（P0，已完成）

### 1.1 现象和根因

- 页面往下滑时，佛像应该跟着滚动"播放"，实际是一顿一顿地跳。
- 实测（改前，有界面 Chromium，桌面 1440×900）：页面本身能跑到 60 帧，但**佛像每秒只刷新 5～8 次**。窄屏多轮测试中丢帧率最高到 60%，最长一帧接近 0.8 秒。
- 视频文件本身没问题：145 帧，每一帧都是关键帧，已经是最适合拖动的编码。卡顿来自以下几点叠加：
  1. 每个动画帧都改一次视频播放位置（`video.currentTime`）。浏览器的跳转是异步的：上一次还没解码完，下一次又来了，画面只能隔几帧刷新一次。
  2. 2026-08-07 为了让 iOS 能出画面加了兜底（`4233d81`、`1834150`）：滚动时先 `play()`，到位后再 `pause()`。播放和暂停反复切换，又给解码器增加了负担。
  3. 2026-07-29 改成"第一次滚动才下载视频"（`9a4e602`，`preload="none"`）：4MB 的视频正好在用户第一次滑的时候下载，所以第一滑最卡。
  4. 视频层上叠了径向渐变遮罩和颜色滤镜，页面最上层还有一张全屏实时噪点滤镜（`<svg><feTurbulence>`），每一帧都要重新合成。
  5. 2026-04-15 做过一次针对第 4 点的减卡顿优化（`376c0b7`），9 分钟后被整个撤回（`8414b1f`），之后再没人处理。

### 1.2 改法（本分支 `perf/hero-image-sequence`）

| 改动 | 文件 |
|---|---|
| 视频拆成图片序列：145 帧 WebP，两套尺寸。手机和平板用 768×512（共 2.0MB），宽于 900px 的屏幕用 1024×682（共 3.1MB）。原视频 4.0MB 已删除 | `public/kling-buddha-scroll-frames/v1/{m,d}/000.webp`～`144.webp` |
| 原来实时计算的调色 `sepia(0.03) saturate(1.02) brightness(0.99) contrast(1.01)` 按 CSS 滤镜公式换算成矩阵，在导出时烘焙进图片，画布上不再套滤镜 | 素材生成命令见 1.4 |
| 组件改成在 `<canvas>` 上换帧：滚动时只按进度算出帧号，`drawImage` 画一帧，不再跳转和解码视频，也不再 `play()`/`pause()` | `src/components/sunyata/ScrollVideoBackground.jsx` |
| 帧位置做轻微缓动（每帧向目标靠近 25%），滚轮一格跳很多帧时画面依然连贯 | 同上 |
| 选帧、加载顺序、降级规则抽成纯函数，单独测试 | `src/lib/scrollFrames.js`、`src/lib/scrollFrames.test.js` |
| 加载顺序：先下第 0、16、32…帧（约 10 帧），佛像立刻能跟着滚动；再逐轮加密（每 8、4、2、1 帧）。还没到的帧用最近的已加载帧代替。同时最多 4 个请求，首帧高优先级、其余低优先级，下载后先 `decode()`，避免滚动时临时解码 | 同上 |
| 下载时机：页面加载完、浏览器空闲时就开始（`requestIdleCallback`，最多等 2 秒），不再等用户第一次滚动；用户先滚动则立即开始 | 组件 |
| 首屏先显示原海报图（和首页预加载的是同一张，最大内容出现时间不变），第一帧到了以后画布盖在上面 | 组件、`src/index.css` |
| 系统开了"减少动态效果"：只显示海报，一帧都不下载 | 组件 |
| 省流量模式或 2G 网络：只下每 4 帧中的 1 帧（37 帧，约 0.5MB） | `shouldLimitScrollFrames` |
| 全屏噪点层从实时滤镜的 `<svg>` 改成样式里的 SVG 背景图（`background-image: url("data:image/svg+xml,…")`，256px 平铺）。效果相同，浏览器只栅格化一次，也不用多下载文件 | `src/components/sunyata/NoiseOverlay.jsx`、`src/index.css` 的 `.grain` |
| 帧目录加一年不过期的缓存头（目录带版本号 `v1`，换素材时新建 `v2`，不要覆盖） | `vercel.json` |
| 测试：组件测试重写（首屏海报、不再有 `<video>`、滚动后先请求稀疏帧、页面加载后自动开始、第一帧画到画布并标记就绪、最终请求全部 145 帧、减少动态效果时不下载）；新增工具函数测试，并检查两套素材都齐全 | `ScrollVideoBackground.test.jsx`、`scrollFrames.test.js` |

保持不变的部分：

- 对外参数，以及编辑器里能调的位置、缩放、停留位置、羽化范围和强度。
- 滚动区间的算法（`src/lib/scrollVideo.js`）。
- 佛像跟随页面的位移。
- 径向渐变遮罩仍用 CSS 实现，确保编辑器调羽化时效果和原来一致。

### 1.3 验收指标

在佛像区间（0→700px）往下、往上各滚 3 秒，mini 负载低于 6 时测：

| 指标 | 改前 | 目标 | 改后 |
|---|---|---|---|
| 页面丢帧率（Chromium 桌面） | 0～27.5%（负载高时） | < 2% | 0～0.4% |
| iOS 手机 Safari 往下滑时显示的不同画面（共 145 帧） | 21～24 | ≥ 130 | 142～143 |
| 4G 网络进页面马上滑，第一滑显示的不同画面 | 2～6（佛像基本不动） | ≥ 100 | 135～144 |
| 手机端下载量 | 4.0MB 视频 | ≤ 2.1MB | 2.0MB |

### 1.4 素材生成命令（换素材时照做）

```bash
V=原视频.mp4; O=public/kling-buddha-scroll-frames/v2   # 新建版本目录
ffmpeg -i $V -vf "colorchannelmixer=rr=0.98179:rg=0.02307:rb=0.00567:gr=0.01047:gg=0.99058:gb=0.00504:br=0.00816:bg=0.01602:bb=0.97393,colorchannelmixer=rr=1.01574:rg=-0.0143:rb=-0.00144:gr=-0.00426:gg=1.0057:gb=-0.00144:br=-0.00426:bg=-0.0143:bb=1.01856,lutrgb=r='clip(val*0.99*1.01-1.275,0,255)':g='clip(val*0.99*1.01-1.275,0,255)':b='clip(val*0.99*1.01-1.275,0,255)'" -start_number 0 graded/%03d.png
mkdir -p $O/m $O/d
for f in graded/*.png; do b=$(basename $f .png)
  cwebp -q 72 -m 6 -resize 768 0 $f -o $O/m/$b.webp
  cwebp -q 72 -m 6 $f -o $O/d/$b.webp
done
```

之后修改 `src/lib/scrollFrames.js` 里的 `SCROLL_FRAME_BASE` 和 `SCROLL_FRAME_COUNT`。

### 1.5 首页还剩的问题（待做）

1. **佛像跟随位移仍由脚本驱动。** 每次滚动都在主线程改一次 `transform`，浏览器在独立线程滚动时会晚一帧，表现为轻微抖动。方案：改用 CSS 滚动驱动动画（`animation-timeline: view()/scroll()`，Chrome 115+、Safari 26+ 支持），不支持的浏览器继续用现有脚本兜底。先做小范围实验，确认不影响编辑器的停留位置计算。
2. **毛玻璃效果**：首页可见区域有 `.interlude-floating-card`（`index.css:473`，blur 16px）、`.wilderness-card.is-glass .wilderness-card-frame`（`index.css:493`，blur 22px）等，全站共 19 处。低端安卓上滚动时很吃显卡。方案：滚动经过的大面积卡片改用半透明纯色加一张预先模糊好的背景图；只保留顶部导航这类小面积毛玻璃；用 `@supports` 和 `(prefers-reduced-transparency)` 提供降级。
3. **字体**：首页从 Google Fonts 加载 4 个字体族共 263KB（Playfair Display、Inter、Libre Baskerville、Montserrat）。方案：改为自托管，只保留实际用到的字重，做拉丁字符子集，标题字体用 `font-display: swap`。
4. **"山野手记"区块图片**：`journal/card-1-background.webp` 334KB、`card-3` 199KB、`card-1-foreground` 174KB、编辑器素材 203KB。方案：按最大显示尺寸重新出图，提供 `srcset`（手机版宽度 ≤ 800px），非首屏图片加 `loading="lazy"`，并写明 `width`/`height`。
5. **卡片轮播 `SunyataArchive`**：动画循环会一直运行，滚出屏幕也不停。线上配置里这个区块是隐藏的，目前不挂载、没有影响；如果以后重新显示，必须先加 `IntersectionObserver`，离屏时暂停。
6. **代码检查失败**：`npx eslint .` 报 4 个错误，都在 `public/open-in-app.js` 第 17、43 行（空的 `catch`、未使用的 `error` 变量）。改成 `catch { /* 忽略：…原因 */ }`，再把 `npm run lint` 加进合并前检查。

---

## 2. 视频站（P1）

线上首页（模拟 4G 手机）：总传输 3.4MB，脚本 1.6MB，最大内容出现 3.6 秒，主线程阻塞 2.1 秒。

### 2.1 列表图片过大

- 首页卡片显示 280×158，用的却是 `large` 变体（1280×720，单张约 200KB）。变体定义在 `packages/service/src/config/cloudflare.ts:21-30`。
  - 改法：列表卡片统一用 `medium`（640×360），并写 `srcset="…/small 320w, …/medium 640w, …/large 1280w"` 和 `sizes="(max-width: 600px) 90vw, 280px"`。只有详情页的大横幅才用 `large`。
- 法师头像显示 50×50，用的是 `packages/ui/public/images/teachers/*.jpg` 的 512×512 原图（每张 43～61KB，像素多 11 倍）。
  - 改法：生成 128×128 的 WebP（约 4KB），原图只给法师主页大头像用；`teacherProfiles.ts` 里分别给出小图和大图地址。
- 所有图片都没有 `loading="lazy"`，也没写 `width`/`height`。
  - 改法：首屏前 2 张写 `fetchpriority="high"`，其余一律 `loading="lazy" decoding="async"`，并写明宽高或 `aspect-ratio`，消除布局跳动（目前 CLS 0.063）。
- 首页横幅 `assets/images/topics/yuanhui/home-banner-v2.jpg` 是 1280×720 的 JPEG，208KB。改法：出 WebP/AVIF 两档（手机 720 宽、桌面 1280 宽），用 `<picture>`。

### 2.2 脚本体积

- 首页主脚本 `index-*.mjs` 压缩后 815KB（未压缩约 3MB）。播放器 `xgplayer`、`hls.js`、上传用的 `tus-js-client`、`react-bootstrap` 很可能都打进了首页。
  - 改法：先用 `rollup-plugin-visualizer`（新增依赖需 Owner 同意；也可以用 Vite 自带的 `build.rollupOptions.output.manualChunks` 配合 `--mode analyze` 手动看）出体积图。然后把播放器、上传、富文本、日期等改成只在对应页面动态 `import()`，Bootstrap 只引入用到的组件样式。
  - 目标：首页脚本压缩后 ≤ 250KB。
- `console.log/debug` 有 11 处留在 `packages/ui/src`，生产构建要去掉（Vite 的 `esbuild.drop: ['console', 'debugger']`）。

### 2.3 依赖安全漏洞（生产依赖：3 个严重、65 个高危）

| 级别 | 包 | 来源 | 处理 |
|---|---|---|---|
| 严重 | `swiper` < 12.1.2（原型污染） | `packages/admin` | 升到 12.1.2 以上，回归测试后台轮播 |
| 严重 | `tar` ≤ 7.5.18 | `sqlite3` 等构建链 | 升 `sqlite3` 或用 `pnpm.overrides` 强制 `tar@^7.5.19` |
| 严重 | `proxy-addr` < 2.0.8（IP 伪造） | `express` | 升 `express` 到最新 5.x；和"信任代理"配置有关，影响限流和日志里的真实 IP，要优先处理 |
| 高危 | `axios`、`form-data`、`follow-redirects` | 支付/云服务 SDK | 升级对应 SDK，或用 `overrides` |
| 高危 | `path-to-regexp`、`body-parser` | `express` | 同上 |
| 高危 | `jws` | `jsonwebtoken` | 升 `jsonwebtoken` 到 9.0.2 以上的最新版 |
| 高危 | `mysql2`、`typeorm`、`nodemailer`、`validator`、`lodash`、`react-router`、`minimatch`、`glob`、`brace-expansion`、`ip-address`、`nanoid` | 各子包 | 逐个升到修复版本 |

做法：每个子包单独一个合并请求，升级后跑 `pnpm -r test` 和视频站端到端冒烟（首页、观看页、上传、支付回调）。完成后在持续集成里加 `pnpm audit --prod --audit-level=high`，出现新的高危就失败。

### 2.4 观看页拖动快进

`videoplayer.tsx` 里拖动时只更新预览缩略图，松手才设置 `currentTime`，写法正确，不需要改。

---

## 3. 简繁转换（四个站共用，P1，改动面最大）

### 3.1 现状

- 官网、视频站、佛典、佛乐的网页默认显示繁体（`DEFAULT_VARIANT = 'hant'`）。
- 做法是在浏览器里动态加载 `opencc-js/cn2t` 字典（压缩后约 450KB，未压缩约 1MB），再用 `TreeWalker` 改写页面上每个文字节点，用 `MutationObserver` 监听之后新增的文字，实时转换（官网 `src/lib/chineseVariant.js`，视频站 `packages/ui/src/libs/chineseVariant.ts:236`，佛典 `src/lib/chineseVariant.js:185`）。
- 实测（同一页面，繁体对比简体，未压缩脚本量）：佛乐 1308KB 对比 240KB；视频站 1725KB 对比 653KB；佛典 1638KB 对比 573KB；官网下载页 1286KB 对比 213KB。
- 列表加载更多、切换页面时，监听器会在主线程上转换新出现的全部文字，滚动时也可能造成卡顿。

### 3.2 方案

**第一阶段（快速见效，不改内容结构）：**

1. 字典改到 Web Worker 里加载和转换。主线程只把待转换的文字批量发过去，收到结果后再回写，避免长任务。
2. 监听器的回调合并到 `requestIdleCallback` 里批量处理，每批不超过 8 毫秒。
3. 已转换过的字符串做内存缓存，并用 `localStorage` 记录版本号，同一段文案不再重复转换。

**第二阶段（根治）：**

1. 界面固定文案（按钮、标题、说明）在构建时生成繁体版本，和现有的多语言资源放在一起，按 `zh-Hant` 直接输出。
2. 接口返回的内容（视频标题、经文、曲目名）由服务端或边缘函数转换并缓存，网页直接拿到繁体结果。经文类内容要用短语级转换（OpenCC 的 `s2twp`），保证用词准确。
3. 网页端去掉 `opencc-js` 依赖，只保留"简/繁"切换开关和对应的请求参数。
4. 验收：繁体模式下，每个站的脚本体积和简体模式相差不超过 20KB；佛典长文页面滚动不再出现超过 50 毫秒的长任务。

---

## 4. 佛典（P2）

- 线上首页（模拟 4G 手机）：主线程阻塞 0.7～0.95 秒。第一次测出 11 秒，复测降到 1 秒以内，判断是冷启动时的偶发值，需要用性能面板再确认一次是哪段代码。
- `assets/discovery/sidebar-buddha-cutout-v2.png` 是 218KB 的透明 PNG。改成带透明通道的 WebP（预计 30～50KB），并按显示尺寸出图。
- 10 张图片都不懒加载、不写尺寸，处理方法同 2.1。
- 毛玻璃 8 处、遮罩 6 处，阅读页长时间滚动时要检查，处理方法同 1.5 第 2 条。
- `src/App.jsx` 有 2732 行，`LazyScriptureReader.jsx` 有 1514 行。后续需求顺带拆分，这次不单独动。

---

## 5. 佛乐（P1 的一部分，改动很小）

- **`music.buddhachat.online` 由 nginx/1.18（Ubuntu）直接提供，没有开启压缩。** 1.09MB 的简繁字典原样下发；同一份文件走 Vercel 只有 0.45MB。改法：在该服务器的 nginx 配置里开启 `gzip on; gzip_types text/javascript application/javascript text/css application/json image/svg+xml;`（有条件再开 brotli），对 `/music/assets/` 设一年缓存。改服务器前先确认这台机器归谁管、是否还有流量（App 内嵌走的是 Vercel 上的 `/music/`）；如果已经不用，就把域名直接指到 Vercel，然后下线这台机器。
- 33 张场景图和封面图全部不懒加载、不写尺寸，处理方法同 2.1。
- 依赖：生产依赖 5 个高危（`vite` 6 及其依赖链）。升级到和其他站一致的 Vite 8 与 `@vitejs/plugin-react` 6。

---

## 6. 后台（P3，内部使用）

- 生产依赖：6 个高危，29 个中危（`@tiptap/core`、`prosemirror-view`、`axios`、`follow-redirects`、`vite`、`source-map-js`）。升级 tiptap 到最新 3.x，回归编辑器的图片和格式矩阵（仓库里有 `editor-format-matrix.png` 作对照）。
- `src/App.jsx` 有 4451 行，`src/styles.css` 有 8250 行。按页面拆分路由和样式，样式改用 CSS Modules 或按页面文件拆开。只在有相关需求时顺带做。

---

## 7. 关于 Astryx（Meta 开源的 React 组件库）

- 它是一套现成的界面组件和主题系统（测试版），要求 React 19 和 StyleX 构建，**不是代码规范或性能检查工具**。
- 接入意味着五个站的界面要按它的组件重写，样式体系也要从现有的纯 CSS、Sass、Bootstrap、Tailwind 换成 StyleX。成本高，也解决不了上面任何一个卡顿或体积问题。
- 结论：**不迁移。** 可以参考它的组件命名、无障碍和主题变量的约定，用在我们自己的规范里（见第 8 节）。

---

## 8. 统一规范与防回退（P1，和修复并行做）

1. **代码检查**：五个仓库统一用 ESLint 9/10 的平铺配置，加 `eslint-plugin-react-hooks` 7，合并前必须通过 `npm run lint`。官网目前代码检查失败，说明合并前没有跑这一步。
2. **构建工具版本对齐**：Vite 统一到 8、`@vitejs/plugin-react` 统一到 6；视频站后台子包（Vite 6、react-hooks 插件 5）和佛乐（Vite 6）先升级。
3. **性能预算**：每个仓库加一个 `scripts/perf-budget.mjs`，构建后检查，不通过就让持续集成失败（不需要新增依赖）：
   - 首屏入口脚本压缩后 ≤ 250KB；单个异步分块 ≤ 200KB；
   - `public/` 下单张图片 ≤ 300KB（动图和帧序列目录除外，单独设上限）；
   - 禁止新增 `.mp4` 作为滚动驱动素材。
4. **图片规范**：
   - 显示尺寸的 2 倍以内出图，优先 WebP/AVIF；
   - 非首屏图片一律 `loading="lazy" decoding="async"`；
   - 必须写 `width`/`height` 或 `aspect-ratio`；
   - 头像、缩略图必须用小尺寸变体。
5. **动效规范**：
   - 跟随滚动的效果优先用 CSS 滚动驱动动画；
   - 脚本驱动的动画循环必须在离屏或静止时停止；
   - 大面积毛玻璃和实时 SVG 滤镜不得放在滚动经过的区域；
   - 必须支持 `prefers-reduced-motion`。
6. **依赖安全**：持续集成里跑 `npm audit --omit=dev --audit-level=high`（视频站用 `pnpm audit --prod`），每月第一周集中处理一次。
7. **线上监测**：在现有统计脚本里上报真实用户的核心网页指标（LCP、CLS、INP），按页面和设备分组，数据存测试库（遵守"自建、不接第三方"的监控方案），每周看一次。

---

## 9. 排期建议

| 顺序 | 内容 | 涉及仓库 | 预计工作量 |
|---|---|---|---|
| 1 | 首页佛像改图片序列、噪点层静态化（**已完成**，待合并到 staging 并验收） | 官网 | 已完成 |
| 2 | 佛乐 nginx 开压缩（或域名改指 Vercel） | 服务器配置 | 0.5 天 |
| 3 | 视频站列表图片和头像改小尺寸、懒加载、写尺寸 | 视频站 | 1 天 |
| 4 | 视频站严重和高危依赖升级 | 视频站 | 2～3 天（分子包） |
| 5 | 各站代码检查修复，合并前强制检查；性能预算脚本 | 五个仓库 | 1～2 天 |
| 6 | 视频站首页脚本拆包 | 视频站 | 2 天 |
| 7 | 简繁转换第一阶段（Worker、批量、缓存） | 四个站 | 2 天 |
| 8 | 官网首页毛玻璃降级、字体自托管、山野手记图片 | 官网 | 1～2 天 |
| 9 | 佛典、佛乐图片整改，佛乐升级 Vite | 佛典、佛乐 | 1 天 |
| 10 | 简繁转换第二阶段（构建时和服务端转换） | 四个站和接口 | 1～2 周 |
| 11 | 佛像跟随位移改 CSS 滚动驱动动画 | 官网 | 1 天（含实验） |
| 12 | 后台依赖升级、大文件拆分 | 后台 | 按需 |

每一项都按仓库规定：先合进 `staging`，在测试环境验收，再按各仓库的正式发布流程走（官网正式发布需要 Owner 批准）。

---

## 10. 实测记录（2026-11-10，mini，`mini-queue` 独占时段，负载 3～7）

测量方法：在佛像区间 0→700px 往下、往上各匀速滚 3 秒（关闭平滑滚动）。"不同画面"指滚动过程中佛像实际显示过的不同帧数（旧版用 `requestVideoFrameCallback` 的 `mediaTime`，新版用画布绘制的帧号）；"追帧"指停手后佛像还要多久才到正确位置。

| 场景 | 版本 | 页面丢帧率 | 往下滑显示的不同画面 | 往上滑显示的不同画面 | 停手后追帧 |
|---|---|---|---|---|---|
| iOS 26.3 模拟器手机 Safari（iPhone 16，393×695@3），4 轮 | 改前 | 1.2～2.1% | **21～24** | 69～72 | 往下约 50ms；往上 **316～334ms** |
| 同上 | 改后 | 1.2～2.1% | **142～143** | 139 | 0～50ms |
| 有界面 Chromium（显卡加速），桌面 1440×900 与窄屏 420×860，各 3 轮 | 改前 | 0% | 144～145 | 139～141 | 16～33ms |
| 同上 | 改后 | 0～0.4% | 144 | 141～142 | 0～1ms |
| 有界面 Chromium，限速 9Mbps，进页面 0.8 秒就开始滑 | 改前 | 0% | **2～6** | 85～126 | 16～34ms |
| 同上 | 改后 | 0% | **135～144** | 141～142 | 0～1ms |

结论：

1. 旧版在 Mac 的 Chrome 上本来就不卡（硬件解码，全关键帧视频跳转快）。卡顿集中在 **iPhone Safari**：往下滑时 145 帧只能显示二十几帧，佛像是跳着动的，往回滑停手后要 0.3 秒多才追到位。
2. 旧版在**第一次往下滑**时佛像基本不动，因为视频这时才开始下载。
3. 新版在三种场景下都几乎逐帧跟手，停手即到位，页面本身的流畅度不受影响。
4. 画面一致性：6 个滚动位置截图对比，相似度（SSIM）0.96～0.98，肉眼看不出差别，差异来自 WebP 压缩。
5. 桌面 Safari 未测：mini 屏幕锁定时 Safari 把页面判为不可见，会暂停动画。真机 iPhone 最后一轮在 staging 上验收。
