import { useSyncExternalStore } from 'react'
import { readHomeTime, setHomeTime, subscribeHomeTime } from './timeOfDay.js'

// 首屏左下角的时段切换和右下角的“正在做的功课”。
// 颜色和高亮全部由 <html data-home-time> 驱动（CSS），构建出来的静态网页不带脚本也显示正确的时段；
// 这里只负责点按切换和读屏用的 aria-pressed。
function HomeTimeOfDay({ times }) {
  // 构建时没有时段（null），浏览器接管后读 <html data-home-time>，与静态网页一致，不会报不一致。
  const active = useSyncExternalStore(subscribeHomeTime, readHomeTime, () => null)

  return (
    <div className="home-time" data-testid="home-time">
      <div className="home-time-tabs" role="group" aria-label={times.label}>
        {times.items.map((item) => (
          <button
            key={item.key}
            type="button"
            className="home-time-tab"
            data-time={item.key}
            aria-pressed={active === item.key}
            onClick={() => setHomeTime(item.key)}
          >
            <span className="home-time-num">{item.number}</span> {item.label}
          </button>
        ))}
      </div>
      <p className="home-time-now" aria-live="polite">
        <svg className="home-time-lotus" viewBox="0 0 24 16" aria-hidden="true" focusable="false">
          <path d="M12 2c2 2.4 2.6 5.6 0 10-2.6-4.4-2-7.6 0-10Zm-1 10C8 11 4.6 8.4 3.6 5.4 7 5.6 9.6 7.8 11 12Zm2 0c1.4-4.2 4-6.4 7.4-6.6C19.4 8.4 16 11 13 12ZM2 10.2c3 .2 6.3 1.4 10 3.8 3.7-2.4 7-3.6 10-3.8" />
        </svg>
        <span className="home-time-now-label">{times.nowLabel}</span>
        <span className="home-time-dot" aria-hidden="true">·</span>
        {times.items.map((item) => (
          <span key={item.key} className="home-time-practice" data-time={item.key}>
            {item.practice}
          </span>
        ))}
      </p>
    </div>
  )
}

export default HomeTimeOfDay
