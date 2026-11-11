import { useEffect } from 'react'
import './fonts.css'
import './home.css'
import SunyataNav from '../components/sunyata/SunyataNav.jsx'
import SunyataAppPreviews from '../components/sunyata/SunyataAppPreviews.jsx'
import SunyataFooter from '../components/sunyata/SunyataFooter.jsx'
import { SACRED_STORIES } from '../content/sacredStories.js'
import { trackNavClick, trackPageView } from '../lib/analytics.js'
import HomeBuddha from './HomeBuddha.jsx'
import HomeDialogue from './HomeDialogue.jsx'
import HomeJournal from './HomeJournal.jsx'
import HomeTimeOfDay from './HomeTimeOfDay.jsx'
import {
  HOME_DIALOGUE,
  HOME_FEATURES,
  HOME_FOOTER,
  HOME_HERO,
  HOME_JOURNAL,
  HOME_NAV,
  HOME_PRESENCE,
  HOME_SHOWCASE,
  HOME_TIMES,
} from './content.js'

const SHOWCASE_FOR_PREVIEWS = {
  ...HOME_SHOWCASE,
  phones: HOME_SHOWCASE.phones.map((phone) => ({
    key: phone.key,
    imageSrc: phone.image,
    imageAlt: phone.alt,
    layout: phone.layout,
  })),
}

// 官网首页（2026-11-11 重做）。构建时生成完整网页（scripts/prerender-home.mjs），
// 浏览器只负责接上交互：佛像换帧、问答输入、故事菜单、山野手记轮播、访问统计。
// 外观沿用原来的样式类名；所有位置由 home.css 的两套版式（宽屏 / 手机）决定，没有编辑器偏移。
// “Ask the Buddha”：滑到问答段后把光标放进输入框（没有脚本时就是普通的页内链接）。
function askTheBuddha(event) {
  const field = document.getElementById('buddha-question')
  const section = document.getElementById('dialogue')
  if (!field || !section) return
  event.preventDefault()
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  section.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  window.setTimeout(() => field.focus({ preventScroll: true }), reduce ? 0 : 700)
}

function HomePage() {
  useEffect(() => {
    const idle = window.requestIdleCallback?.(() => trackPageView(), { timeout: 2500 })
    const timer = idle === undefined ? window.setTimeout(() => trackPageView(), 1500) : null
    const onNavClick = (event) => {
      const link = event.target.closest?.('nav a[href]')
      if (link) trackNavClick(link.getAttribute('href'))
    }
    document.addEventListener('click', onNavClick, true)
    return () => {
      document.removeEventListener('click', onNavClick, true)
      if (idle !== undefined) window.cancelIdleCallback?.(idle)
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [])

  return (
    <main className="sunyata-page scene-ready home-page">
      <div className="grain" aria-hidden="true" />
      <div className="void-bg" aria-hidden="true" />
      <SunyataNav nav={HOME_NAV} stories={SACRED_STORIES} />

      <div className="home-stage">
        <HomeBuddha />
        <section className="hero-container" id="path">
          <div className="hero-left" data-testid="hero-copy-column">
            <h1 className="hero-title">{HOME_HERO.title}</h1>
            <div className="hero-rule" aria-hidden="true" />
            <p className="subtitle">{HOME_HERO.subtitle}</p>
            <div className="hero-actions">
              <a className="hero-cta hero-cta--primary" href={HOME_HERO.primaryAction.href} onClick={askTheBuddha}>
                {HOME_HERO.primaryAction.label}
              </a>
              <a className="hero-cta hero-cta--secondary" href={HOME_HERO.secondaryAction.href}>
                {HOME_HERO.secondaryAction.label}
              </a>
            </div>
          </div>
          <div className="hero-right" aria-hidden="true">
            <div className="devotional-space">
              <div className="gold-circle" />
              <div className="fog-frame" />
            </div>
          </div>
          <HomeTimeOfDay times={HOME_TIMES} />
        </section>
        <div className="home-buddha-slot" aria-hidden="true" />
        <HomeDialogue interlude={HOME_DIALOGUE} />
      </div>

      <HomeJournal journal={HOME_JOURNAL} />

      <section className="content-section" id="sanctuary" data-testid="cards-section">
        <div className="content-grid">
          {HOME_FEATURES.map((card) => (
            <article key={card.title} className="feature-card">
              <span className="card-num">{card.number}</span>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <SunyataAppPreviews showcase={SHOWCASE_FOR_PREVIEWS} />

      <section className="visual-quote-section" id="vessels">
        <div className="visual-anchor">
          <div className="ghost-label" aria-hidden="true">
            {HOME_PRESENCE.ghostLabel}
          </div>
          <img
            className="main-visual"
            src="/home/presence-1600.webp"
            srcSet="/home/presence-800.webp 800w, /home/presence-1600.webp 1600w"
            sizes="(max-width: 900px) 80vw, 66vw"
            alt={HOME_PRESENCE.imageAlt}
            loading="lazy"
            decoding="async"
          />
          <div className="quote-wrap visual-quote-wrap" id="silence" data-testid="visual-quote-overlay">
            <p className="quote-copy">{HOME_PRESENCE.text}</p>
            <div className="quote-details">
              <div>
                <h3>{HOME_PRESENCE.studioLabel}</h3>
                <p>{HOME_PRESENCE.studioText}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SunyataFooter footer={HOME_FOOTER} />
    </main>
  )
}

export default HomePage
