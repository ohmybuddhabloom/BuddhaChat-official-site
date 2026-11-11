#!/bin/bash
# 首页佛像 v3：从 4 月原版视频（kling-buddha-scroll-scrub.mp4，1024×682，145 帧）直接做母版。
# 用法：bash scripts/hero-motion/encode-v3.sh <原版视频> <输出目录>
# 不要再从 WebP 帧图做母版：质量 72 的 WebP 会损失 8%～16% 的清晰度。
set -euo pipefail
src=$1; out=$2; mkdir -p "$out"
# 帧图版当时烘焙进去的调色：sepia(0.03) saturate(1.02) brightness(0.99) contrast(1.01) 换算成的矩阵
GRADE="colorchannelmixer=rr=0.98179:rg=0.02307:rb=0.00567:gr=0.01047:gg=0.99058:gb=0.00504:br=0.00816:bg=0.01602:bb=0.97393,colorchannelmixer=rr=1.01574:rg=-0.0143:rb=-0.00144:gr=-0.00426:gg=1.0057:gb=-0.00144:br=-0.00426:bg=-0.0143:bb=1.01856,lutrgb=r='clip(val*0.99*1.01-1.275,0,255)':g='clip(val*0.99*1.01-1.275,0,255)':b='clip(val*0.99*1.01-1.275,0,255)'"
ffmpeg -v error -y -i "$src" -vf "$GRADE" -c:v ffv1 -pix_fmt rgb24 "$out/master.mkv"
# 两段：a = 第 0～47 帧，b = 第 48～144 帧；每帧都是关键帧（-g 1），跳到任意帧只要几毫秒
for part in "a 0 47" "b 48 144"; do
  set -- $part
  ffmpeg -v error -y -i "$out/master.mkv" -vf "select=between(n\,$2\,$3),setpts=N/24/TB,setsar=1" -r 24 \
    -c:v libx264 -preset slow -crf 20 -g 1 -keyint_min 1 -sc_threshold 0 -pix_fmt yuv420p -an -movflags +faststart "$out/$1.mp4"
done
ls -l "$out"
