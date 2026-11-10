// 逐帧随动控制器：照搬 oil-motion 的 createFrameAnimator（assets/interactive-motion.ts），只保留一维线性时间轴。
// 输入只更新目标帧；实际渲染集中在 requestAnimationFrame，目标不变时停止循环。

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function smoothDamp(current, target, velocity, smoothTime, maxSpeed, deltaTime) {
  const safeTime = Math.max(0.0001, smoothTime)
  const omega = 2 / safeTime
  const x = omega * deltaTime
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
  const originalTarget = target
  const maxChange = maxSpeed * safeTime
  const change = clamp(current - target, -maxChange, maxChange)
  const limitedTarget = current - change
  const temp = (velocity + omega * change) * deltaTime
  let nextVelocity = (velocity - omega * temp) * decay
  let nextPosition = limitedTarget + (change + temp) * decay
  if ((originalTarget - current > 0) === (nextPosition > originalTarget)) {
    nextPosition = originalTarget
    nextVelocity = 0
  }
  return [nextPosition, nextVelocity]
}

export function createFrameAnimator({
  frameCount,
  initialFrame = 0,
  smoothTime = 0.11,
  maxSpeed,
  reducedMotion = false,
  render,
  requestFrame = (callback) => requestAnimationFrame(callback),
  cancelFrame = (id) => cancelAnimationFrame(id),
}) {
  const count = Math.max(1, Math.floor(frameCount))
  const speed = maxSpeed ?? count * 2
  let position = clamp(initialFrame, 0, count - 1)
  let target = position
  let velocity = 0
  let lastFrame = -1
  let lastTime = 0
  let raf = 0
  let destroyed = false

  const draw = () => {
    const frame = Math.round(clamp(position, 0, count - 1))
    if (frame !== lastFrame) {
      render(frame)
      lastFrame = frame
    }
  }

  const loop = (now) => {
    raf = 0
    if (destroyed) return
    const deltaTime = lastTime ? Math.min((now - lastTime) / 1000, 1 / 30) : 1 / 60
    lastTime = now
    if (reducedMotion) {
      position = target
      velocity = 0
    } else {
      ;[position, velocity] = smoothDamp(position, target, velocity, smoothTime, speed, deltaTime)
    }
    draw()
    if (Math.abs(target - position) > 0.002 || Math.abs(velocity) > 0.002) {
      raf = requestFrame(loop)
    } else {
      lastTime = 0
    }
  }

  draw()

  return {
    setProgress(progress) {
      target = clamp(progress, 0, 1) * (count - 1)
      if (!raf && !destroyed) raf = requestFrame(loop)
    },
    redraw() {
      lastFrame = -1
      draw()
    },
    getCurrentFrame: () => position,
    destroy() {
      destroyed = true
      if (raf) cancelFrame(raf)
      raf = 0
    },
  }
}
