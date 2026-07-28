import { describe, expect, it } from 'vitest'

import { getPageMeta, injectPageMeta } from './page-entry.js'

const html = `<!doctype html><html><head>
  <title>Old</title>
  <meta name="description" content="Old" />
  <meta property="og:title" content="Old" />
</head><body><div id="root"></div></body></html>`

describe('page social metadata', () => {
  it('uses content metadata for known stories and removes tracking parameters', () => {
    const meta = getPageMeta(
      new URL(
        'https://www.buddhachat.online/?story=children-of-scripture&utm_source=test',
      ),
    )

    expect(meta.type).toBe('article')
    expect(meta.title).toContain('Children of Scripture')
    expect(meta.canonicalUrl).toBe(
      'https://www.buddhachat.online/?story=children-of-scripture',
    )
    expect(meta.imageUrl).toMatch(/^https:\/\/www\.buddhachat\.online\/share\//)
  })

  it('falls back safely for unknown story values', () => {
    const meta = getPageMeta(
      new URL('https://www.buddhachat.online/?story=%3Cscript%3E'),
    )

    expect(meta.title).toBe('BuddhaChat｜一念连接，万法相伴')
    expect(meta.canonicalUrl).toBe('https://www.buddhachat.online/')
  })

  it.each([
    'https://www.buddhachat.online/',
    'https://www.buddhachat.online/api/page-entry?page=home',
  ])('keeps the public home URL for %s', (url) => {
    const meta = getPageMeta(new URL(url))

    expect(meta.canonicalUrl).toBe('https://www.buddhachat.online/')
  })

  it('emits one complete server-rendered card', () => {
    const rendered = injectPageMeta(
      html,
      getPageMeta(
        new URL('https://www.buddhachat.online/?page=download&ch=poster'),
      ),
    )

    expect(rendered.match(/property="og:title"/g)).toHaveLength(1)
    expect(rendered.match(/name="description"/g)).toHaveLength(1)
    expect(rendered).toContain('property="og:image:width" content="1200"')
    expect(rendered).toContain('property="og:image:alt"')
    expect(rendered).not.toContain('ch=poster')
  })

  it.each([
    'https://www.buddhachat.online/download',
    'https://www.buddhachat.online/download/',
    'https://www.buddhachat.online/download?ch=whatsapp',
    'https://www.buddhachat.online/download/yuanhui?ch=poster',
  ])('uses the same large download card for %s', (url) => {
    const meta = getPageMeta(new URL(url))
    const rendered = injectPageMeta(html, meta)

    expect(meta).toMatchObject({
      title: '下载 BuddhaChat｜一念连接，万法相伴',
      description:
        '经书、法师开示视频、冥想佛乐与每日修行，一站汇聚在 BuddhaChat。',
      canonicalUrl: 'https://www.buddhachat.online/download',
      imageUrl:
        'https://www.buddhachat.online/share/download-card-v1.jpg',
      type: 'website',
    })
    expect(rendered).toContain('property="og:image:width" content="1200"')
    expect(rendered).toContain('property="og:image:height" content="630"')
    expect(rendered).toContain('property="og:locale" content="zh_CN"')
    expect(rendered).not.toContain('ch=')
  })

  it.each([
    'https://www.buddhachat.online/guide/yuanhui',
    'https://www.buddhachat.online/guide/yuanhui/',
    'https://www.buddhachat.online/guide/yuanhui?ch=poster',
    'https://www.buddhachat.online/api/page-entry?page=guide-yuanhui&campaign=temple',
  ])('uses the same large Yuanhui guide card for %s', (url) => {
    const meta = getPageMeta(new URL(url))
    const rendered = injectPageMeta(html, meta)

    expect(meta).toMatchObject({
      title: 'BuddhaChat 手机端使用指南｜从扫码到源慧法师专区',
      description:
        '从官方下载、安装和首次使用，到每日修行及进入源慧法师专区，跟着指南一步一步完成。',
      canonicalUrl: 'https://www.buddhachat.online/guide/yuanhui',
      imageUrl:
        'https://www.buddhachat.online/share/download-card-v1.jpg',
      type: 'article',
    })
    expect(rendered).toContain('property="og:image:width" content="1200"')
    expect(rendered).toContain('property="og:image:height" content="630"')
    expect(rendered).toContain('name="twitter:card" content="summary_large_image"')
    expect(rendered).not.toContain('ch=poster')
    expect(rendered).not.toContain('campaign=temple')
  })

  it.each([
    [
      'https://www.buddhachat.online/future-product/page?ch=poster&utm_source=whatsapp',
      'https://www.buddhachat.online/future-product/page',
    ],
    [
      'https://www.buddhachat.online/future-product/page/?campaign=temple',
      'https://www.buddhachat.online/future-product/page',
    ],
    [
      'https://www.buddhachat.online/api/page-entry?path=future-product%2Fpage&ch=poster',
      'https://www.buddhachat.online/future-product/page',
    ],
  ])(
    'uses the default large card for future route %s',
    (url, canonicalUrl) => {
      const meta = getPageMeta(new URL(url))
      const rendered = injectPageMeta(html, meta)

      expect(meta).toMatchObject({
        title: 'BuddhaChat｜一念连接，万法相伴',
        canonicalUrl,
        imageUrl:
          'https://www.buddhachat.online/share/official-card-v1.jpg',
        type: 'website',
      })
      expect(rendered).toContain('property="og:image:width" content="1200"')
      expect(rendered).toContain('property="og:image:height" content="630"')
      expect(rendered).toContain(
        'name="twitter:card" content="summary_large_image"',
      )
      expect(rendered).not.toContain('ch=poster')
      expect(rendered).not.toContain('utm_source=whatsapp')
      expect(rendered).not.toContain('campaign=temple')
    },
  )
})
