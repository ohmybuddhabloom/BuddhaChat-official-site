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

    expect(meta.title).toBe('BuddhaChat')
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
})
