import { useEffect } from 'react'

import { trackCtaClick } from '../lib/analytics.js'

const FEATURES = [
  ['每日修行', '禅修、木鱼、持咒、诵经和每日功课集中在一起，从几分钟开始也可以。'],
  ['AI 佛祖对话', '随时倾诉烦恼、连续追问，并把得到的启发连接到具体修行练习。'],
  ['法师专属内容', '开示视频、文章、课程与持续更新的专属内容，不再需要到处寻找。'],
  ['道场与师兄社区', '加入感兴趣的道场，与法师、师兄交流和共修，修行不再是一个人。'],
  ['经书 · 视频 · 佛乐', '根据当下需要选择阅读、观看或聆听，把不同修学方式连在一起。'],
  ['个人修行档案', '修行次数、功课和成长持续沉淀，随时回看自己的修学过程。'],
]

const YUANHUI_CONTENT = [
  ['法师介绍', '了解源慧法师和专题内容。'],
  ['历年开示视频', '过去公开发布的开示集中观看。'],
  ['开示文章', '把视频中的内容继续深入理解。'],
  ['专属课程', '正式发布后按照系列持续学习。'],
  ['禅修与活动', '查看后续正式公布的禅修场次与活动信息。'],
]

export default function YuanhuiUserGuidePage() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'BuddhaChat 手机端使用指南'
    return () => {
      document.title = previousTitle
    }
  }, [])

  return (
    <main className="user-guide-page">
      <div className="user-guide-shell">
        <header className="user-guide-hero">
          <a className="user-guide-brand" href="/">BUDDHA CHAT</a>
          <div className="user-guide-hero-copy">
            <span>手机端使用指南</span>
            <h1>从扫码，到找到源慧法师</h1>
            <p>第一次使用也不用担心。跟着页面一直往下滑，就能完成下载、开始修行并进入法师专区。</p>
          </div>
          <nav className="user-guide-route" aria-label="完整使用流程">
            {['扫码', '下载', '打开 APP', '开始修行', '进入专区'].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </nav>
        </header>

        <div className="user-guide-steps">
          <section className="user-guide-step">
            <span className="user-guide-number">01</span>
            <div className="user-guide-kicker">从线下海报开始</div>
            <h2>扫码，进入官方下载页</h2>
            <div className="user-guide-card">
              <p>打开手机相机或系统扫码功能，对准海报二维码。扫码后会先进入 BuddhaChat 官方下载页，不会直接跳到来历不明的安装包。</p>
              <div className="user-guide-action"><b>扫</b> 手机相机 / 系统扫码功能</div>
              <a
                className="user-guide-button"
                href="/download?ch=yuanhuidaochang"
                onClick={() => trackCtaClick('yuanhui_guide_download', 'app')}
              >
                下载 BuddhaChat APP
              </a>
            </div>
          </section>

          <section className="user-guide-step">
            <span className="user-guide-number">02</span>
            <div className="user-guide-kicker">按照自己的手机选择</div>
            <h2>点对应的下载入口</h2>
            <div className="user-guide-device">
              <b>苹果</b>
              <div><h3>iPhone 用户</h3><p>在下载页点击 App Store 按钮，再按系统提示下载安装。</p></div>
            </div>
            <div className="user-guide-device">
              <b>安卓</b>
              <div><h3>Android 用户</h3><p>优先选择 Google Play；也可以使用页面提供的官方安卓安装包。</p></div>
            </div>
            <p className="user-guide-warning">如果安卓按钮显示“下载地址配置中”，请等待官方开放，不要从其他网站安装不明安装包。</p>
          </section>

          <section className="user-guide-step">
            <span className="user-guide-number">03</span>
            <div className="user-guide-kicker">第一次打开 APP</div>
            <h2>按提示进入，马上开始体验</h2>
            <div className="user-guide-card">
              <p>安装完成后点击 BuddhaChat 图标，按照页面提示完成简单引导。可以先用游客方式体验；需要长期保存记录或使用部分社群功能时，再登录账号。</p>
              <div className="user-guide-tags"><span>游客可以体验</span><span>登录可保存记录</span></div>
            </div>
          </section>

          <section className="user-guide-step">
            <span className="user-guide-number">04</span>
            <div className="user-guide-kicker">打开后能做什么</div>
            <h2>一个 APP，完成日常修学</h2>
            <div className="user-guide-list">
              {FEATURES.map(([title, description]) => (
                <article key={title}><h3>{title}</h3><p>{description}</p></article>
              ))}
            </div>
          </section>

          <section className="user-guide-step">
            <span className="user-guide-number">05</span>
            <div className="user-guide-kicker">找到法师专属内容</div>
            <h2>从首页进入源慧法师专区</h2>
            <div className="user-guide-card">
              <p>完成首次体验后，按照下面三步进入源慧法师的集中内容页：</p>
              <ol className="user-guide-path">
                <li>打开 BuddhaChat</li>
                <li>回到 Home 首页</li>
                <li>点击“源慧法师”专题入口</li>
              </ol>
              <p className="user-guide-warning">如果当前 APP 首页暂时没有看到入口，可以先进入源慧法师官方专题页。</p>
              <a
                className="user-guide-button"
                href="https://yuanhui.buddhachat.online"
                onClick={() => trackCtaClick('yuanhui_guide_topic', 'videos')}
                rel="noreferrer"
              >
                进入源慧法师专区
              </a>
            </div>
          </section>

          <section className="user-guide-step">
            <span className="user-guide-number">06</span>
            <div className="user-guide-kicker">进入专区以后</div>
            <h2>这些内容都能集中查看</h2>
            <div className="user-guide-list">
              {YUANHUI_CONTENT.map(([title, description]) => (
                <article key={title}><h3>{title}</h3><p>{description}</p></article>
              ))}
            </div>
          </section>

          <section className="user-guide-finish">
            <small>完成</small>
            <h2>到这里，你已经走完整条使用流程</h2>
            <p>以后打开 BuddhaChat，就可以继续每日修行、与 AI 佛祖对话、查看法师内容并参与道场共修。</p>
          </section>
        </div>

        <footer className="user-guide-footer">BuddhaChat · 把修行带回每天的生活<br />下载后按页面提示开始使用。</footer>
      </div>
    </main>
  )
}
