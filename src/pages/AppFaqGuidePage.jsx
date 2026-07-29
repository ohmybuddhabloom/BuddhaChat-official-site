import { useEffect } from 'react'

import { trackCtaClick } from '../lib/analytics.js'

const FEATURES = [
  ['修', '每日修行', '禅修、木鱼、持咒、诵经与功课记录集中完成，让每天的修行看得见、能坚持。'],
  ['佛', 'AI 佛祖对话', '完成问答后匹配你的守护佛，随时倾诉、连续追问，并把启发变成下一步具体练习。'],
  ['法', '法师专属内容', '开示、文章、课程和后续专属内容集中持续更新，不用再到处寻找。'],
  ['众', '道场共修社区', '加入感兴趣的道场，与法师和师兄们交流，让线上修行不再孤单。'],
  ['藏', '经书 · 视频 · 佛乐', '根据当下需要选择阅读、观看或聆听，多种修学内容一站汇聚。'],
  ['录', '个人修行档案', '持续沉淀功课、修行次数和个人成长，随时回看自己的修学足迹。'],
]

const FAQS = [
  ['这个 APP 是干什么的？', 'BuddhaChat 是一站式佛教修学平台，汇集每日修行、AI 佛祖对话、法师开示、佛经阅读、佛教视频与佛乐、道场共修及个人修行记录，让闻、思、修与交流在一个 APP 中自然衔接。'],
  ['这个 APP 收费吗？', 'BuddhaChat 的日常修学功能可免费使用；部分专属内容或增值服务可能单独收费，用户可按需选择，不影响免费功能的正常使用。'],
  ['一定要注册账号吗？', '可以先用游客方式快速体验；登录后还能长期保存功课、修行记录和社群关系。'],
  ['iPhone 怎么下载？', '扫描海报二维码，点击“App Store 下载”即可；也可以打开 App Store，搜索“BuddhaChat”下载安装。'],
  ['Android 怎么下载？', '扫描同一个二维码，可选择 Google Play 或官方安卓安装包；也可以在 Google Play 搜索“BuddhaChat”下载安装。'],
  ['怎么确认是官方 APP？', '二维码固定进入 BuddhaChat 官方页面，下载入口变化后也不用重新寻找。'],
  ['APP 主要有哪些功能？', '每日修行、AI 佛祖对话、法师专属内容、道场社区、经书视频佛乐和个人修行档案。'],
  ['AI 佛祖对话有什么亮点？', '完成问答后会匹配你的守护佛，可以随时倾诉、连续追问，还能把启发连接到具体修行。'],
  ['怎么找到源慧法师？', '在首页点击“源慧法师”专题入口，一键进入，不用搜索姓名或翻找视频。'],
  ['源慧法师专区里有什么？', '法师介绍、历年开示视频、文章、后续专属课程和禅修活动，集中持续更新。'],
]

export default function AppFaqGuidePage() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'BuddhaChat 六大亮点与用户十问'
    return () => {
      document.title = previousTitle
    }
  }, [])

  return (
    <main className="app-faq-page">
      <div className="app-faq-shell">
        <header className="app-faq-hero">
          <a className="app-faq-brand" href="/">BUDDHA CHAT</a>
          <div className="app-faq-hero-copy">
            <span>一站式佛教修学 APP</span>
            <h1>把修行，带回每天的生活</h1>
            <p>六大产品亮点 · 用户最常问的 10 个问题</p>
          </div>
        </header>

        <section className="app-faq-section" aria-labelledby="app-faq-features">
          <div className="app-faq-heading">
            <span>01</span>
            <h2 id="app-faq-features">为什么值得使用 BuddhaChat</h2>
          </div>
          <div className="app-faq-features">
            {FEATURES.map(([icon, title, description]) => (
              <article key={title}>
                <div><span>{icon}</span><h3>{title}</h3></div>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="app-faq-section" aria-labelledby="app-faq-questions">
          <div className="app-faq-heading">
            <span>02</span>
            <h2 id="app-faq-questions">用户最常问的 10 个问题</h2>
          </div>
          <div className="app-faq-questions">
            {FAQS.map(([question, answer], index) => (
              <details key={question} open={index === 0}>
                <summary>
                  <b>{String(index + 1).padStart(2, '0')}</b>
                  <span>{question}</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="app-faq-finish">
          <span>一念连接，万法相伴</span>
          <h2>在一个安静、可信的空间里，找到内容、陪伴与共修。</h2>
          <a
            href="/download?ch=yuanhuidaochang"
            onClick={() => trackCtaClick('app_faq_guide_download', 'app')}
          >
            下载 BuddhaChat APP
          </a>
        </section>
      </div>
    </main>
  )
}
