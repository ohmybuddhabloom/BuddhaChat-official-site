import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HomeBuddha from './HomeBuddha.jsx'
import HomeDialogue from './HomeDialogue.jsx'
import HomeJournal from './HomeJournal.jsx'
import HomePage from './HomePage.jsx'
import { SPLIT_FRAME, getSegmentUrl, getStickProgress, locateFrame, pickVideoSet } from './buddhaMotion.js'
import { HOME_DIALOGUE, HOME_JOURNAL, HOME_NAV } from './content.js'
import { submitChatPrompt } from '../lib/siteApi.js'

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

  it('宽于 900 用桌面版，地址按段区分', () => {
    expect(pickVideoSet(1440)).toBe('d')
    expect(pickVideoSet(390)).toBe('m')
    expect(getSegmentUrl('m', 'a')).toBe('/kling-buddha-scroll-video/v2/m-a.mp4')
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

  it('先显示封面，视频不预加载；访客一滚动就以低优先级下载 a 段', async () => {
    Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true })
    render(<HomeBuddha />)
    expect(screen.getByTestId('home-buddha').querySelector('img')).toBeInTheDocument()
    expect(screen.getByTestId('home-buddha-video-a')).toHaveAttribute('preload', 'none')
    expect(screen.getByTestId('home-buddha-video-a').muted).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.scroll(window)
    await act(async () => {})
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/kling-buddha-scroll-video/v2/d-a.mp4')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ priority: 'low' })
    delete document.readyState
  })

  it('页面已加载完时直接下载 a 段，不等滚动', async () => {
    render(<HomeBuddha />)
    await act(async () => {})
    expect(fetchMock.mock.calls[0][0]).toBe('/kling-buddha-scroll-video/v2/d-a.mp4')
  })

  it('偏好减少动态效果的访客不下载视频', async () => {
    vi.stubGlobal('matchMedia', (query) => ({ matches: query.includes('reduce'), addEventListener() {}, removeEventListener() {} }))
    window.matchMedia = globalThis.matchMedia
    render(<HomeBuddha />)
    fireEvent.scroll(window)
    await act(async () => {})
    expect(fetchMock).not.toHaveBeenCalled()
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
