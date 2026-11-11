import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HomeBuddha, { FOLLOW_MAX_SPEED, FOLLOW_SMOOTH_TIME } from './HomeBuddha.jsx'
import HomeDialogue from './HomeDialogue.jsx'
import HomeJournal from './HomeJournal.jsx'
import HomePage from './HomePage.jsx'
import { SPLIT_FRAME, getSegmentUrl, getStickProgress, locateFrame } from './buddhaMotion.js'
import { HOME_DIALOGUE, HOME_JOURNAL, HOME_NAV } from './content.js'
import { submitChatPrompt } from '../lib/siteApi.js'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createFrameAnimator } from '../lib/frameAnimator.js'

vi.mock('../lib/siteApi.js', () => ({
  submitChatPrompt: vi.fn(() => Promise.resolve({ ok: true })),
}))

afterEach(() => {
  cleanup()
})

vi.mock('../lib/fusionAuth.js', () => ({
  fetchZentubeSession: vi.fn(() => Promise.resolve({ user: null })),
}))

describe('首页整页', () => {
  it('构建时生成的 HTML 已经包含各段文字，浏览器接管时没有不一致警告', async () => {
    const html = renderToString(<HomePage />)
    for (const text of ['Buddha Chat', 'Place a question into the hush.', 'Whispers to the Buddha', 'Seek and it is given']) {
      expect(html).toContain(text.replace(/'/g, '&#x27;'))
    }

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    let root
    await act(async () => {
      root = hydrateRoot(container, <HomePage />)
    })
    expect(errors.mock.calls.map((call) => call.slice(1).map(String).join(" ").slice(0, 1500))).toEqual([])
    errors.mockRestore()
    act(() => root.unmount())
    container.remove()
  })

  it('导航只有一个登录入口，并包含视频、佛经、佛乐', () => {
    render(<HomePage />)
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    const signIns = HOME_NAV.links.filter((link) => /sign in/i.test(link.label))
    expect(signIns).toHaveLength(1)
    for (const label of ['Videos', 'Sutra', 'Music']) {
      expect(nav).toHaveTextContent(label)
    }
  })

  it('引言叠在引言图区域里，锚点 #silence 与 #vessels 都在', () => {
    const { container } = render(<HomePage />)
    const anchor = container.querySelector('#vessels .visual-anchor')
    expect(anchor.querySelector('#silence')).toHaveTextContent('A single seed brings a vast harvest')
  })
})

describe('佛像两段视频', () => {
  it('第 0～47 帧在 a 段，之后在 b 段；b 段没准备好时停在 a 段最后一帧', () => {
    expect(locateFrame(0, false)).toEqual({ part: 'a', local: 0 })
    expect(locateFrame(SPLIT_FRAME - 1, true)).toEqual({ part: 'a', local: SPLIT_FRAME - 1 })
    expect(locateFrame(SPLIT_FRAME, true)).toEqual({ part: 'b', local: 0 })
    expect(locateFrame(144, true)).toEqual({ part: 'b', local: 96 })
    expect(locateFrame(120, false)).toEqual({ part: 'a', local: SPLIT_FRAME - 1 })
    expect(locateFrame(999, true)).toEqual({ part: 'b', local: 96 })
  })

  it('手机和电脑共用同一套 1024 宽视频，地址按段区分', () => {
    expect(getSegmentUrl('a')).toBe('/kling-buddha-scroll-video/v3/a.mp4')
    expect(getSegmentUrl('b')).toBe('/kling-buddha-scroll-video/v3/b.mp4')
  })

  it('吸附进度：从页面顶部到佛像离开轨道，0 到 1，两端截住', () => {
    const geometry = { trackTop: 0, trackHeight: 1500, figureHeight: 500, stickTop: 200 }
    // 吸住的距离 = 1500 - 500 - 200 = 800
    expect(getStickProgress(0, geometry)).toBe(0)
    expect(getStickProgress(200, geometry)).toBeCloseTo(0.25)
    expect(getStickProgress(800, geometry)).toBe(1)
    expect(getStickProgress(-50, geometry)).toBe(0)
    expect(getStickProgress(100, { ...geometry, trackHeight: 400 })).toBe(0)
  })
})

describe('佛像跟手', () => {
  // 按 60Hz 推进动画，返回画面第一次显示目标帧所用的毫秒数
  const settleMs = (options, jumpTo) => {
    const queue = []
    let shown = 0
    const animator = createFrameAnimator({ frameCount: 145, render: (frame) => (shown = frame), requestFrame: (cb) => queue.push(cb), cancelFrame: () => {}, ...options })
    animator.setProgress(jumpTo / 144)
    let now = 0
    let reached = -1
    while (queue.length && now < 3000) {
      now += 1000 / 60
      queue.shift()(now)
      if (reached < 0 && shown === jumpTo) reached = now
    }
    expect(shown).toBe(jumpTo)
    return reached
  }

  it('滚一格（约 15 帧）在 150 毫秒内追上，比技能默认缓动快至少一倍', () => {
    const fast = settleMs({ smoothTime: FOLLOW_SMOOTH_TIME, maxSpeed: FOLLOW_MAX_SPEED }, 15)
    expect(fast).toBeLessThanOrEqual(150)
    expect(settleMs({}, 15)).toBeGreaterThan(fast * 2)
  })

  it('一下滑到底也不被限速：整段 145 帧在 200 毫秒内走完', () => {
    expect(settleMs({ smoothTime: FOLLOW_SMOOTH_TIME, maxSpeed: FOLLOW_MAX_SPEED }, 144)).toBeLessThanOrEqual(200)
  })
})

describe('佛像组件', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn(() => Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:hero', revokeObjectURL: () => {} }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('先显示封面，视频标签不预加载；一接管就以高优先级下载 a 段', async () => {
    render(<HomeBuddha />)
    expect(screen.getByTestId('home-buddha').querySelector('img')).toBeInTheDocument()
    expect(screen.getByTestId('home-buddha-video-a')).toHaveAttribute('preload', 'none')
    expect(screen.getByTestId('home-buddha-video-a').muted).toBe(true)
    await act(async () => {})
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/kling-buddha-scroll-video/v3/a.mp4')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ priority: 'high' })
  })

  it('a 段边下载边把进度报给加载画面，结束后报告佛像就绪', async () => {
    const loader = { progress: vi.fn(), step: vi.fn() }
    window.__homeLoader = loader
    const chunks = [new Uint8Array(30), new Uint8Array(70)]
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        headers: { get: (name) => (name === 'content-length' ? '100' : null) },
        body: { getReader: () => ({ read: () => Promise.resolve(chunks.length ? { done: false, value: chunks.shift() } : { done: true }) }) },
      }),
    )
    render(<HomeBuddha />)
    await waitFor(() => expect(loader.progress).toHaveBeenCalledTimes(2))
    expect(loader.progress.mock.calls.map((call) => call[1])).toEqual([0.3, 1])
    expect(loader.step).not.toHaveBeenCalled()
    // 测试环境不会真的解码视频，手动发出“元数据已就绪”
    fireEvent(screen.getByTestId('home-buddha-video-a'), new Event('loadedmetadata'))
    await waitFor(() => expect(loader.step).toHaveBeenCalledWith('buddha'))
    delete window.__homeLoader
  })

  it('a 段下载失败也报告就绪，加载画面不会一直挡着', async () => {
    const loader = { progress: vi.fn(), step: vi.fn() }
    window.__homeLoader = loader
    fetchMock.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 503 }))
    render(<HomeBuddha />)
    await waitFor(() => expect(loader.step).toHaveBeenCalledWith('buddha'))
    delete window.__homeLoader
  })

  it('偏好减少动态效果的访客不下载视频', async () => {
    vi.stubGlobal('matchMedia', (query) => ({ matches: query.includes('reduce'), addEventListener() {}, removeEventListener() {} }))
    window.matchMedia = globalThis.matchMedia
    const loader = { progress: vi.fn(), step: vi.fn() }
    window.__homeLoader = loader
    render(<HomeBuddha />)
    await act(async () => {})
    expect(fetchMock).not.toHaveBeenCalled()
    expect(loader.step).toHaveBeenCalledWith('buddha')
    delete window.__homeLoader
    delete window.matchMedia
  })
})

describe('问答段', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('同时只显示一组问答，新问题替换旧的', async () => {
    vi.useFakeTimers()
    const dialogue = { ...HOME_DIALOGUE, responseDelayMs: 1, fadeDurationMs: 1 }
    render(<HomeDialogue interlude={dialogue} />)

    fireEvent.change(screen.getByLabelText('Ask Buddha a question'), { target: { value: 'How do I move through uncertainty?' } })
    fireEvent.click(screen.getByRole('button', { name: dialogue.actionLabel }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(40)
    })
    expect(screen.getByTestId('interlude-user-card')).toHaveTextContent('How do I move through uncertainty?')
    expect(screen.getByTestId('interlude-reply-card')).toHaveTextContent(dialogue.responseText)

    fireEvent.change(screen.getByLabelText('Ask Buddha a question'), { target: { value: 'What should I release today?' } })
    fireEvent.click(screen.getByRole('button', { name: dialogue.actionLabel }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(80)
    })
    expect(screen.getByTestId('interlude-user-card')).toHaveTextContent('What should I release today?')
    expect(screen.queryByText('How do I move through uncertainty?')).not.toBeInTheDocument()
    expect(screen.getAllByTestId(/interlude-(user|reply)-card/)).toHaveLength(2)
  })

  it('记录提交的问题，不阻塞动画', async () => {
    render(<HomeDialogue interlude={HOME_DIALOGUE} />)
    fireEvent.change(screen.getByLabelText('Ask Buddha a question'), { target: { value: 'What should I carry forward?' } })
    fireEvent.click(screen.getByRole('button', { name: HOME_DIALOGUE.actionLabel }))
    await waitFor(() => {
      expect(submitChatPrompt).toHaveBeenCalledWith({ message: 'What should I carry forward?' })
    })
  })
})

describe('山野手记', () => {
  let observerCallback

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback) {
          observerCallback = callback
        }
        observe() {}
        disconnect() {}
      },
    )
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('第一张是焦点，其余是玻璃态；点卡片切到对应故事', () => {
    const { container } = render(<HomeJournal journal={HOME_JOURNAL} />)
    const cards = container.querySelectorAll('.wilderness-card')
    expect(cards[0]).toHaveClass('is-active', 'is-focus')
    expect(cards[1]).toHaveClass('is-glass')

    const cta = screen.getByRole('link', { name: HOME_JOURNAL.actionLabel })
    expect(cta).toHaveAttribute('href', `/?story=${HOME_JOURNAL.items[0].slug}`)
    fireEvent.click(screen.getAllByRole('button', { name: /Open / })[1])
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(cta).toHaveAttribute('href', `/?story=${HOME_JOURNAL.items[1].slug}`)
  })

  it('不在屏幕上时不自动轮换，进入屏幕后才轮换', () => {
    render(<HomeJournal journal={HOME_JOURNAL} />)
    const cta = screen.getByRole('link', { name: HOME_JOURNAL.actionLabel })
    act(() => {
      vi.advanceTimersByTime(12000)
    })
    expect(cta).toHaveAttribute('href', `/?story=${HOME_JOURNAL.items[0].slug}`)

    act(() => {
      observerCallback([{ isIntersecting: true }])
    })
    act(() => {
      vi.advanceTimersByTime(5600)
    })
    expect(cta).toHaveAttribute('href', `/?story=${HOME_JOURNAL.items[1].slug}`)
  })

  it('图片按显示尺寸提供两档并延迟加载', () => {
    const { container } = render(<HomeJournal journal={HOME_JOURNAL} />)
    const card = container.querySelector('.wilderness-card-image')
    expect(card).toHaveAttribute('loading', 'lazy')
    expect(card.getAttribute('srcset')).toContain('430w')
    expect(container.querySelector('.wilderness-background img')).toHaveAttribute('loading', 'lazy')
  })
})

describe('加载画面', () => {
  // 取 home.html 里的加载画面和内联脚本，在测试页面里实际运行
  const template = readFileSync(path.join(process.cwd(), 'home.html'), 'utf8')
  const markup = template.match(/<div id="home-loader"[\s\S]*?<\/svg>[\s\S]*?<\/div>\s*<\/div>/)[0]
  const script = template.match(/<script>\s*(\/\/ 加载画面[\s\S]*?)<\/script>/)[1]

  const boot = ({ posterComplete }) => {
    document.body.innerHTML = `${markup}<img class="hero-scroll-poster" />`
    Object.defineProperty(document.body.querySelector('img'), 'complete', { value: posterComplete })
    document.documentElement.className = ''
    new Function(script)()
    return document.getElementById('home-loader')
  }

  afterEach(() => {
    vi.useRealTimers()
    delete window.__homeLoader
    document.documentElement.className = ''
    document.body.innerHTML = ''
  })

  it('打开时锁住滚动；字体、封面、佛像都就绪后淡出整页', async () => {
    vi.useFakeTimers()
    const el = boot({ posterComplete: true })
    expect(document.documentElement).toHaveClass('home-loading')
    window.__homeLoader.progress('buddha', 0.5)
    expect(Number(el.style.getPropertyValue('--home-loader-p'))).toBeGreaterThan(0.3)
    await act(async () => {})
    window.__homeLoader.step('buddha')
    vi.advanceTimersByTime(300)
    expect(document.documentElement).toHaveClass('home-loaded')
    expect(document.documentElement).not.toHaveClass('home-loading')
  })

  it('佛像一直没就绪时，最多 8 秒也会显示页面', () => {
    vi.useFakeTimers()
    boot({ posterComplete: false })
    vi.advanceTimersByTime(7900)
    expect(document.documentElement).not.toHaveClass('home-loaded')
    vi.advanceTimersByTime(200)
    expect(document.documentElement).toHaveClass('home-loaded')
  })

  it('脚本没运行时，纯样式兜底 8 秒后自己隐藏', () => {
    expect(template).toMatch(/animation: home-loader-failsafe [^;]*8s forwards/)
  })
})

describe('佛像两段视频只显示一段', () => {
  it('没轮到的那段透明，规则优先级压过 index.css 的 .hero-scroll-figure.is-ready .hero-scroll-video', () => {
    const css = readFileSync(path.join(process.cwd(), 'src/home/home.css'), 'utf8')
    expect(css).toMatch(/\.hero-scroll-figure\.home-buddha\.is-ready \.hero-scroll-video \{[^}]*opacity: 0/)
    expect(css).toMatch(/\.hero-scroll-figure\.home-buddha\.is-ready \.hero-scroll-video\.is-visible \{[^}]*opacity: 1/)
    const { container } = render(<HomeBuddha />)
    expect(container.querySelector('.hero-scroll-figure.home-buddha.is-ready')).toBeInTheDocument()
  })
})

describe('首屏标题', () => {
  it('标题不再模糊（11-12 Owner：像被遮罩挡在后面）', () => {
    const css = readFileSync(path.join(process.cwd(), 'src/home/home.css'), 'utf8')
    const rule = css.match(/\.home-page \.hero-title \{[^}]*\}/)[0]
    expect(rule).toMatch(/filter: none/)
    expect(rule).not.toMatch(/blur\(/)
  })
})

describe('问答段与浮动按钮', () => {
  it('问答段进入屏幕时给页面加标记，离开时去掉', () => {
    let callback
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb) {
          callback = cb
        }
        observe() {}
        disconnect() {}
      },
    )
    render(<HomeDialogue interlude={HOME_DIALOGUE} />)
    act(() => callback([{ isIntersecting: true }]))
    expect(document.documentElement).toHaveClass('home-dialogue-in-view')
    act(() => callback([{ isIntersecting: false }]))
    expect(document.documentElement).not.toHaveClass('home-dialogue-in-view')
    vi.unstubAllGlobals()
  })
})
