import { beforeEach, describe, expect, it } from 'vitest'

import { getChineseVariant, setChineseVariant } from './chineseVariant.js'

const flushMutations = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('chineseVariant', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.body.innerHTML = ''
    document.documentElement.removeAttribute('lang')
  })

  it('defaults to traditional Chinese when no preference is stored', () => {
    expect(getChineseVariant()).toBe('hant')
  })

  it('converts page text and attributes to traditional and restores them', async () => {
    document.body.innerHTML =
      '<p>法师开示，让心慢下来。</p><input placeholder="搜索经名、译者" /><span title="道场共修">x</span>'

    await setChineseVariant('hant')

    expect(document.querySelector('p').textContent).toBe('法師開示，讓心慢下來。')
    expect(document.querySelector('input').getAttribute('placeholder')).toBe('搜索經名、譯者')
    expect(document.querySelector('span').getAttribute('title')).toBe('道場共修')
    expect(document.documentElement.getAttribute('lang')).toBe('zh-Hant')

    await setChineseVariant('hans')

    expect(document.querySelector('p').textContent).toBe('法师开示，让心慢下来。')
    expect(document.querySelector('input').getAttribute('placeholder')).toBe('搜索经名、译者')
    expect(document.querySelector('span').getAttribute('title')).toBe('道场共修')
    expect(document.documentElement.getAttribute('lang')).toBe('zh-Hans')
  })

  it('converts nodes added after traditional mode is active', async () => {
    document.body.innerHTML = '<main id="app"></main>'
    await setChineseVariant('hant')

    const card = document.createElement('p')
    card.textContent = '持续修行'
    document.getElementById('app').appendChild(card)
    await flushMutations()

    expect(card.textContent).toBe('持續修行')
  })

  it('re-converts text that React updates while traditional mode is active', async () => {
    document.body.innerHTML = '<p>道场共修</p>'
    await setChineseVariant('hant')
    const node = document.querySelector('p').firstChild
    expect(node.nodeValue).toBe('道場共修')

    node.nodeValue = '法师开示'
    await flushMutations()

    expect(node.nodeValue).toBe('法師開示')
  })

  it('leaves data-no-convert subtrees untouched', async () => {
    document.body.innerHTML =
      '<div data-no-convert><button>简</button><button>繁</button></div><p>经书视频</p>'

    await setChineseVariant('hant')

    expect(document.querySelector('[data-no-convert]').textContent).toBe('简繁')
    expect(document.querySelector('p').textContent).toBe('經書視頻')
  })

  it('persists the selected variant', async () => {
    await setChineseVariant('hans')
    expect(getChineseVariant()).toBe('hans')
    await setChineseVariant('hant')
    expect(getChineseVariant()).toBe('hant')
  })
})
