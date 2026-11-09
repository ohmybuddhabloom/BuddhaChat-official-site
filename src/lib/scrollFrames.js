// 首页佛像滚动图片序列：选帧、加载顺序与降级规则。
// 素材由 kling-buddha-scroll-scrub.mp4 逐帧导出（调色已烘焙进图片），
// 放在 public/kling-buddha-scroll-frames/<版本>/<m 或 d>/ 下，文件名为三位帧号。
// 换素材时新建版本目录，不要覆盖旧目录：线上缓存一年不过期。

export const SCROLL_FRAME_COUNT = 145
export const SCROLL_FRAME_BASE = '/kling-buddha-scroll-frames/v1'
export const SCROLL_FRAME_SIZES = {
  m: { width: 768, height: 512 },
  d: { width: 1024, height: 682 },
}

// 佛像在 900px 以下的视口最宽 390px，768 宽素材在 2～3 倍屏上已足够清晰。
export function pickScrollFrameSet(viewportWidth) {
  return Number.isFinite(viewportWidth) && viewportWidth > 900 ? 'd' : 'm'
}

export function getScrollFrameUrl(set, index) {
  return `${SCROLL_FRAME_BASE}/${set}/${String(index).padStart(3, '0')}.webp`
}

// 先下稀疏的帧，再逐轮加密：第一轮约 10 帧就能让佛像跟着滚动走，
// 其余帧在后台补齐，未到的帧用最近的已加载帧代替。
export function buildScrollFrameLoadOrder(count, steps = [16, 8, 4, 2, 1]) {
  const order = []
  const seen = new Set()

  for (const step of steps) {
    for (let index = 0; index < count; index += step) {
      if (!seen.has(index)) {
        seen.add(index)
        order.push(index)
      }
    }
    const last = count - 1
    if (count > 0 && !seen.has(last)) {
      seen.add(last)
      order.push(last)
    }
  }

  return order
}

// 省流量或 2G 网络只下每 4 帧中的 1 帧（约 37 帧）。
export function shouldLimitScrollFrames(connection) {
  if (!connection) return false
  if (connection.saveData) return true
  return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g'
}

export function limitScrollFrameLoadOrder(order, step = 4) {
  const count = order.length ? Math.max(...order) + 1 : 0
  return order.filter((index) => index % step === 0 || index === count - 1)
}

export function findNearestLoadedFrame(frames, index) {
  const count = frames.length
  if (!count) return -1
  const target = Math.min(Math.max(Math.round(index), 0), count - 1)

  for (let distance = 0; distance < count; distance += 1) {
    const before = target - distance
    if (before >= 0 && frames[before]) return before
    const after = target + distance
    if (after < count && frames[after]) return after
  }

  return -1
}
