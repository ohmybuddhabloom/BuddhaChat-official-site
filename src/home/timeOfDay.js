// 首屏时段规则。home.html 的内联脚本在首次绘制前按同一规则写 <html data-home-time>，
// 避免先显示一个时段的颜色再跳到另一个；改这里必须同步改 home.html（home.test.jsx 会比对两者）。
export const HOME_TIME_KEYS = ['dawn', 'day', 'dusk', 'night']

export function pickTimeOfDay(hour) {
  if (hour >= 5 && hour < 10) return 'dawn'
  if (hour >= 10 && hour < 17) return 'day'
  if (hour >= 17 && hour < 20) return 'dusk'
  return 'night'
}

export function readHomeTime() {
  if (typeof document === 'undefined') return null
  const value = document.documentElement.getAttribute('data-home-time')
  return HOME_TIME_KEYS.includes(value) ? value : null
}

export function setHomeTime(key) {
  if (typeof document === 'undefined' || !HOME_TIME_KEYS.includes(key)) return
  document.documentElement.setAttribute('data-home-time', key)
}

export function subscribeHomeTime(onChange) {
  if (typeof MutationObserver !== 'function') return () => {}
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-home-time'] })
  return () => observer.disconnect()
}
