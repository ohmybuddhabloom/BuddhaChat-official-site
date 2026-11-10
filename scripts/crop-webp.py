# 按目标比例居中裁切并缩放成 webp：crop-webp.py 源 目标 宽 高
import subprocess, sys
src, dst, w, h = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
iw, ih = map(int, subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src]).decode().strip().split(','))
r = w / h
cw, ch = (ih * r, ih) if iw / ih > r else (iw, iw / r)
x, y = (iw - cw) / 2, (ih - ch) / 2
subprocess.check_call(['cwebp', '-quiet', '-q', '78', '-crop', str(int(x)), str(int(y)), str(int(cw)), str(int(ch)), '-resize', str(w), str(h), src, '-o', dst])
