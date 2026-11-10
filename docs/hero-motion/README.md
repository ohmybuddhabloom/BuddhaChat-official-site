# 首页佛像滚动动画（oil-motion：baked-video + frame-scrub）

2026-11-10 按 Owner 要求用 [oil-motion](https://github.com/oil-oil/oil-motion) 重做。四份事实源都在本目录：

- `concept-contract.yaml`：要求（保持现有画面，滚动逐帧推进，打开速度不能比改之前慢）
- `motion-brief.yaml`：生产计划
- `motion-budget.json`：预算脚本的选择结果（baked-video + frame-scrub）
- `timeline.json`：编译产物；页面用的是 `src/lib/heroMotion.timeline.json`（同一份，加了说明字段）

## 怎么重新生成

```bash
OIL_MOTION=~/.claude/skills/oil-motion
# 1. 母版：用调好色的 145 张帧图合成无损视频（换素材时换成新帧图）
ffmpeg -framerate 24 -i 帧图目录/%03d.webp -c:v ffv1 graded-master.mkv
# 2. 预算（最大显示 640 CSS px）
python3 $OIL_MOTION/scripts/motion_budget.py --frames 145 --display 640x426 --dpr 1.6 --source 1024x682 \
  --driver scroll --time-control scrub --parameter-space linear --background-owner video --scroll-pages 2 \
  --report build/motion-budget.json --strict --json
# 3. 编译：全关键帧 MP4，压缩率调到 24/25（默认 12/14 会让文件比帧图还大）
python3 $OIL_MOTION/scripts/compile_scroll_video.py graded-master.mkv out --background-owner video \
  --budget-report build/motion-budget.json --frame-policy native --fps 24 --timeline-output build/timeline.json \
  --desktop-width 1024 --mobile-width 768 --desktop-crf 25 --mobile-crf 24
```

- ffmpeg 9 去掉了 oil-motion 脚本里用的 `-vsync`；在 mini 上用 `~/bc-oil-motion/bin/ffmpeg` 包一层（换成 `-fps_mode passthrough`）。
- 新素材放 `public/kling-buddha-scroll-video/v2/`，不要覆盖 v1（缓存一年）。

## 运行时要点（`src/lib/heroMotion.js`、`src/lib/frameAnimator.js`）

- 首屏图片、字体下完、网络空闲 1.2 秒才下载视频（最多等 10 秒）；访客一滚动就立即下载。整段下载成内存地址再挂到 `<video>`。
- 苹果 Safari：视频没播放过就不解码画面。加载后先静音 `play()` 再 `pause()`；不允许自动播放（低电量模式）时等第一次触摸。
- 只提交最新目标帧；目标时间与当前相同、或 300 毫秒没收到 `seeked` 都直接放行，防止定位卡住。

## 验收记录（2026-11-10，mini，本机限速）

- 4 Mbps 五轮中位：页面其余资源全部完成 旧版（视频）4.6 秒、145 帧图版 5.3 秒、本版 4.9 秒；首屏三版相同。
- iOS 模拟器 Safari 四轮：快滑 2.5 秒看到不同帧 41～43（帧图版 30～33），慢滑 6 秒 61（58～59）；预热后单次定位约 3 毫秒。
- 未测：物理 iPhone、桌面 Safari。
