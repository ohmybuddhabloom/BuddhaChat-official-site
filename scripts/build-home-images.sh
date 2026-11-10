#!/bin/bash
# 首页图片按实际显示尺寸出图（大小两档，供 srcset）。原图不动；换图时改这里重跑。
set -e
cd "$(dirname "$0")/../public"
scripts=../scripts
out=home
q=78
card() { # 山野手记卡片：显示约 430×474，按卡片比例居中裁切
  local src=$1 name=$2
  for w in 860 430; do
    h=$((w*474/430))
    python3 $scripts/crop-webp.py "$src" "$out/$name-$w.webp" $w $h
  done
}
wide() { # 全宽背景、引言大图：1920/960 两档
  local src=$1 name=$2; shift 2
  for w in "$@"; do cwebp -quiet -q $q -resize $w 0 "$src" -o "$out/$name-$w.webp"; done
}
card editor-assets/2026-04-13T04-30-05-514Z-kling_20260412_-_-_-1___393_0.webp journal-thangka-card
card editor-assets/2026-04-13T04-29-38-508Z-DSC01541.webp journal-amethyst-card
card editor-assets/2026-04-14T20-18-46-668Z-DSC01789.webp journal-scripture-card
wide journal/card-1-background.webp journal-thangka-bg 1920 960
wide journal/card-2-background.webp journal-amethyst-bg 1600 960
wide editor-assets/2026-04-14T19-30-56-466Z-2026-04-15-03-30-43.webp journal-scripture-bg 1920 960
wide editor-assets/2026-04-13T04-02-04-178Z-kling_20260412_-_-_-1__3298_0.webp presence 1600 800
wide app-previews/master-updates.webp phone-master-updates 480
wide app-previews/foshuo-home.webp phone-home 480
wide app-previews/qa-detail.webp phone-qa-detail 480
cwebp -quiet -q 80 -resize 768 0 kling-buddha-scroll-poster.jpg -o $out/buddha-poster-768.webp
cwebp -quiet -q 80 kling-buddha-scroll-poster.jpg -o $out/buddha-poster-1280.webp
ls -l $out | awk 'NR>1{printf "%s %dKB\n",$9,$5/1024}'
