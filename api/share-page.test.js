import { describe, expect, it } from 'vitest'

import { getSharePage, injectPageMeta, injectShareData } from './page-entry.js'
import { loadShareCard } from './share-card.js'
import { safeImageUrl } from './_lib/shareContent.js'
import { readSharePath, readShareParams, shareEnvironment, shareLinks } from '../src/lib/sharePage.js'

// 1.4.5 任务8: every shared video, question and article opens on www/s/<type>/<id> with its own card.

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

function fakeFetch(routes) {
  const calls = []
  const fetcher = async (url) => {
    calls.push(String(url))
    for (const [prefix, answer] of Object.entries(routes)) {
      if (String(url).startsWith(prefix)) return typeof answer === 'function' ? answer(url) : answer
    }
    return new Response('not found', { status: 404 })
  }
  fetcher.calls = calls
  return fetcher
}

const VIDEO = {
  id: 'UwWNDUfyxL9',
  title: '愣嚴咒',
  description: 'Leng Yan Curse',
  thumbnailUrls: { large: 'https://customer-x.cloudflarestream.com/signed/thumbnails/thumbnail.jpg' },
  author: { displayName: '正心正念' },
  isPublic: true,
  status: 'published',
  accessPolicy: 'public',
  duration: 899,
}

describe('share page paths and links', () => {
  it('accepts only known types with their exact id shapes', () => {
    expect(readSharePath('/s/video/UwWNDUfyxL9')).toEqual({ type: 'video', id: 'UwWNDUfyxL9', asset: null })
    expect(readSharePath('/s/video/UwWNDUfyxL9/card.jpg')).toEqual({ type: 'video', id: 'UwWNDUfyxL9', asset: 'card' })
    expect(readSharePath('/s/qa/23/')).toEqual({ type: 'qa', id: '23', asset: null })
    expect(readSharePath('/s/yuanhui/yuanhui-001-q001')).toEqual({ type: 'yuanhui', id: 'yuanhui-001-q001', asset: null })
    expect(readSharePath('/s/sutra/practice-vow')).toEqual({ type: 'sutra', id: 'practice-vow', asset: null })
    expect(readSharePath('/s/video/short')).toBeNull()
    expect(readSharePath('/s/qa/0')).toBeNull()
    expect(readSharePath('/s/qa/12a')).toBeNull()
    expect(readSharePath('/s/unknown/1')).toBeNull()
    expect(readSharePath('/s/yuanhui/%3Cscript%3E')).toBeNull()
    expect(readSharePath('/s/video/UwWNDUfyxL9/extra')).toBeNull()
    expect(readSharePath('/lamp/ABCDEFGH')).toBeNull()
  })

  it('keeps only well-formed tracking values', () => {
    expect(readShareParams('?r=abc123XYZ&ch=whatsapp&h=2&i=ABCDEFGH&l=zh-Hant&utm=x')).toEqual({ r: 'abc123XYZ', ch: 'whatsapp', h: 2, i: 'ABCDEFGH', l: 'zh-Hant' })
    expect(readShareParams('?r=%3Cx%3E&ch=Bad Channel&h=0&i=ABCDEFG1&l=fr')).toEqual({})
    expect(readShareParams('?h=100')).toEqual({})
  })

  it('opens the same page in the App and carries it through an install, per environment', () => {
    const prod = shareLinks(shareEnvironment('www.buddhachat.online'), 'video', 'UwWNDUfyxL9', { r: 'abc123', ch: 'wechat', i: 'ABCDEFGH' })
    expect(prod.canonical).toBe('https://www.buddhachat.online/s/video/UwWNDUfyxL9')
    expect(prod.page).toBe('https://www.buddhachat.online/s/video/UwWNDUfyxL9?r=abc123&ch=wechat&i=ABCDEFGH')
    expect(prod.link).toBe(`https://go.buddhachat.online/l/page?url=${encodeURIComponent(prod.page)}`)
    expect(prod.appUrl).toBe(`buddhachat://l/page?url=${encodeURIComponent(prod.page)}`)
    expect(decodeURIComponent(prod.googlePlayUrl.split('referrer=')[1])).toContain(`deep_link=${encodeURIComponent(prod.link)}`)
    // Passing it on keeps the first sharer and counts one more hand.
    expect(prod.reshare).toBe('https://www.buddhachat.online/s/video/UwWNDUfyxL9?r=abc123&ch=web&h=2&i=ABCDEFGH')

    const staging = shareLinks(shareEnvironment('staging.buddhachat.online'), 'qa', '23', {})
    expect(staging.canonical).toBe('https://staging.buddhachat.online/s/qa/23')
    expect(staging.link.startsWith('https://staging-admin.buddhachat.online/l/page?url=')).toBe(true)
    expect(staging.appUrl.startsWith('buddhachat-staging://')).toBe(true)
    expect(staging.googlePlayUrl).toBeNull()
  })
})

describe('share page content', () => {
  const url = (path) => new URL(`https://www.buddhachat.online/api/page-entry?path=${encodeURIComponent(path.replace(/^\//, ''))}`)

  it('gives a public video its own card and an embedded player', async () => {
    const fetcher = fakeFetch({ 'https://zentube.buddhachat.online/api/videos/UwWNDUfyxL9': json(VIDEO) })
    const page = await getSharePage(new URL('https://www.buddhachat.online/s/video/UwWNDUfyxL9?ch=whatsapp&l=en'), 'production', fetcher)
    expect(page.status).toBe(200)
    expect(page.meta).toMatchObject({
      title: '愣嚴咒｜正心正念',
      description: 'Leng Yan Curse',
      canonicalUrl: 'https://www.buddhachat.online/s/video/UwWNDUfyxL9',
      imageUrl: 'https://www.buddhachat.online/s/video/UwWNDUfyxL9/card.jpg',
      type: 'video.other',
      locale: 'en_US',
    })
    expect(page.data.state).toBe('ready')
    expect(page.data.media).toEqual({ kind: 'video', embedUrl: 'https://www.buddhachat.online/videos/embed/UwWNDUfyxL9', durationSec: 899 })
    expect(page.data.params).toEqual({ ch: 'whatsapp', l: 'en' })
    expect(page.data.links.cardUrl).toBe('https://www.buddhachat.online/s/video/UwWNDUfyxL9/card.jpg')
  })

  it('reads the rewritten path the site router hands over', async () => {
    const fetcher = fakeFetch({ 'https://zentube.buddhachat.online/api/videos/UwWNDUfyxL9': json(VIDEO) })
    const page = await getSharePage(url('/s/video/UwWNDUfyxL9'), 'production', fetcher)
    expect(page.data.title).toBe('愣嚴咒')
  })

  it('shows only the cover of a video that is not public', async () => {
    const fetcher = fakeFetch({ 'https://zentube.buddhachat.online/api/videos/UwWNDUfyxL9': json({ ...VIDEO, accessPolicy: 'course' }) })
    const page = await getSharePage(url('/s/video/UwWNDUfyxL9'), 'production', fetcher)
    expect(page.data.media).toEqual({ kind: 'cover', embedUrl: null, durationSec: 899 })
  })

  it('answers 404 with the plain site card for missing content', async () => {
    const page = await getSharePage(url('/s/video/UwWNDUfyxL9'), 'production', fakeFetch({}))
    expect(page.status).toBe(404)
    expect(page.data.state).toBe('missing')
    expect(page.meta.imageUrl).toBe('https://www.buddhachat.online/share/official-card-v1.jpg')
  })

  it('still answers the page when the source is down, with a short cache', async () => {
    const page = await getSharePage(url('/s/video/UwWNDUfyxL9'), 'production', fakeFetch({ 'https://zentube': new Response('x', { status: 502 }) }))
    expect(page.status).toBe(200)
    expect(page.cache).toBe('public, s-maxage=30')
    expect(page.data.state).toBe('unavailable')
  })

  it('shows a question with its answer and never an anonymous asker', async () => {
    const fetcher = fakeFetch({
      'https://xqibxlpzghveyqemprjr.supabase.co/functions/v1/public-question?topic_id=23': json({
        environment: 'production',
        question: { item_id: 'topic:23', title: '念佛总是妄念纷飞？', body: '念佛时杂念特别多', author_name: '张三', is_anonymous: true, answer: { body: '妄念多，恰恰说明你开始觉察了。', author_name: 'BuddhaChat 官方' } },
      }),
    })
    const page = await getSharePage(url('/s/qa/23'), 'production', fetcher)
    expect(page.meta.title).toBe('念佛总是妄念纷飞？｜BuddhaChat 官方')
    expect(page.meta.imageUrl).toBe('https://www.buddhachat.online/share/official-card-v1.jpg')
    expect(page.data.blocks).toEqual([
      { type: 'question', text: '念佛时杂念特别多' },
      { type: 'answer', text: '妄念多，恰恰说明你开始觉察了。', author: 'BuddhaChat 官方' },
    ])
    expect(JSON.stringify(page.data)).not.toContain('张三')
  })

  it('refuses a question answered for the other environment', async () => {
    const fetcher = fakeFetch({
      'https://lsiycbdglqtltlecvzky.supabase.co/functions/v1/public-question': json({ environment: 'production', question: { item_id: 'topic:23', title: 't', body: 'b', is_anonymous: true, answer: null } }),
    })
    const page = await getSharePage(url('/s/qa/23'), 'staging', fetcher)
    expect(page.data.state).toBe('unavailable')
  })

  const YUANHUI_JSON = {
    'zh-CN': { 'yuanhui-001-q001': [
      { type: 'quote', text: '问：悟后起修，为何一悟便可与师父心相应？' },
      { type: 'paragraph', text: '实际上修行真的是需要悟后起修的。' },
      { type: 'paragraph', text: '第二段' },
      { type: 'image', text: 'ignored' },
    ] },
  }

  it('titles a 源慧 article as the App does and keeps its question in the body', async () => {
    const fetcher = fakeFetch({
      'https://yuanhui.buddhachat.online/assets/data/yuanhui/articles/001.json': json(YUANHUI_JSON),
      'https://yuanhui.buddhachat.online/articles/yuanhui-001-q001': new Response('<html><head><meta property="og:title" content="如何与师父心相应" /></head></html>', { headers: { 'content-type': 'text/html' } }),
    })
    const page = await getSharePage(url('/s/yuanhui/yuanhui-001-q001'), 'production', fetcher)
    expect(page.meta.title).toBe('如何与师父心相应｜源慧法师')
    expect(page.meta.description).toBe('实际上修行真的是需要悟后起修的。')
    expect(page.data.blocks.map((block) => block.type)).toEqual(['quote', 'paragraph', 'paragraph'])
  })

  it('falls back to the question as title when the article page is unreachable', async () => {
    const fetcher = fakeFetch({ 'https://yuanhui.buddhachat.online/assets/data/yuanhui/articles/001.json': json(YUANHUI_JSON) })
    const page = await getSharePage(url('/s/yuanhui/yuanhui-001-q001'), 'production', fetcher)
    expect(page.meta.title).toBe('悟后起修，为何一悟便可与师父心相应？｜源慧法师')
    // The question is the title, so the page body starts with the answer.
    expect(page.data.blocks.map((block) => block.text)).toEqual(['实际上修行真的是需要悟后起修的。', '第二段'])
  })

  it('reads staging content from staging sources only', async () => {
    const fetcher = fakeFetch({ 'https://staging-zentube.buddhachat.online/api/videos/UwWNDUfyxL9': json(VIDEO) })
    const page = await getSharePage(url('/s/video/UwWNDUfyxL9'), 'staging', fetcher)
    expect(page.data.links.canonical).toBe('https://staging.buddhachat.online/s/video/UwWNDUfyxL9')
    expect(page.data.media.embedUrl).toBe('https://staging.buddhachat.online/videos/embed/UwWNDUfyxL9')
    expect(fetcher.calls).toEqual(['https://staging-zentube.buddhachat.online/api/videos/UwWNDUfyxL9'])
  })

  it('sends a book to the reader’s own share page', async () => {
    const page = await getSharePage(url('/s/sutra/practice-vow'), 'production', fakeFetch({}))
    expect(page).toEqual({ status: 302, location: 'https://www.buddhachat.online/sutra/s/practice-vow' })
  })

  it('leaves every other path to the site', async () => {
    expect(await getSharePage(url('/download'), 'production', fakeFetch({}))).toBeNull()
    expect(await getSharePage(url('/s/video/UwWNDUfyxL9/card.jpg'), 'production', fakeFetch({}))).toBeNull()
  })

  it('never lets content text close the data script', () => {
    const html = injectShareData('<html><head><title>x</title></head><body></body></html>', { title: '</script><script>alert(1)</script>\u2028' })
    expect(html).not.toContain('</script><script>alert(1)')
    expect(html).toContain('\\u003c/script>')
    expect(html).toContain('\\u2028')
    const meta = injectPageMeta(html, { title: '"><b>', description: 'd', canonicalUrl: 'c', imageUrl: 'i', type: 'article' })
    expect(meta).toContain('&quot;&gt;&lt;b&gt;')
  })
})

describe('源慧 title parsing (local review of #126)', () => {
  it('reads og:title in any attribute order and quoting, skipping comments', async () => {
    const { readOgTitle, decodeEntities } = await import('./_lib/shareContent.js')
    expect(readOgTitle('<head><meta content="如何与师父心相应" property="og:title"></head>')).toBe('如何与师父心相应')
    expect(readOgTitle("<head><meta property='og:title' data-x='1' content='A &amp;quot; B'></head>")).toBe('A &quot; B')
    expect(readOgTitle('<head><!-- <meta property="og:title" content="fake"> --><meta property="og:title" content="real"></head>')).toBe('real')
    expect(readOgTitle('<head></head><body><meta property="og:title" content="body"></body>')).toBeNull()
    expect(decodeEntities('&lt;a&gt; &#20013;&#x6587;&nbsp;&bogus;')).toBe('<a> 中文 &bogus;')
  })
})

describe('佛乐 and 藏经阁 share pages', () => {
  const url = (path) => new URL(`https://www.buddhachat.online${path}`)

  it('plays a published track from the Tokyo copy Mainland China reaches', async () => {
    const seen = []
    const fetcher = async (u, options) => {
      seen.push([String(u), options?.headers?.apikey?.slice(0, 3)])
      return json([{ id: 1, title: '百字明', collection: '梵音与藏音', duration_seconds: 214, image_url: '/assets/scene-chant.jpg', audio_url: 'https://music.buddhachat.online/audio/%E7%99%BE%E5%AD%97%E6%98%8E.mp3' }])
    }
    const page = await getSharePage(url('/s/music/1'), 'staging', fetcher)
    expect(page.status).toBe(200)
    expect(page.meta.title).toBe('百字明｜梵音与藏音')
    expect(page.meta.description).toBe('梵音与藏音 · 4 分钟')
    expect(page.data.media).toEqual({ kind: 'audio', audioUrl: 'https://buddha-tokyo-1300001083.cos.ap-tokyo.myqcloud.com/audio/%E7%99%BE%E5%AD%97%E6%98%8E.mp3', durationSec: 214 })
    // The catalog is production's in both environments, read with the public anon key.
    expect(seen[0][0]).toMatch(/^https:\/\/xqibxlpzghveyqemprjr\.supabase\.co\/rest\/v1\/music_tracks\?.*id=eq\.1&is_published=eq\.true/)
    expect(seen[0][1]).toBe('eyJ')
  })

  it('answers missing for an unpublished or unknown track, and never plays another host', async () => {
    expect((await getSharePage(url('/s/music/9'), 'production', async () => json([]))).status).toBe(404)
    const odd = await getSharePage(url('/s/music/1'), 'production', async () => json([{ id: 1, title: 't', audio_url: 'https://evil.example/a.mp3' }]))
    expect(odd.data.media).toBeNull()
    expect((await getSharePage(url('/s/music/abc'), 'production', async () => json([]))).status).toBe(404)
  })

  it('shows a 藏经阁 item in the sharer’s language from this environment’s database', async () => {
    const seen = []
    const fetcher = async (u) => {
      seen.push(String(u))
      return json([{ id: 'yungang', cover_url: 'https://bjswjgadnariutxibsfh.supabase.co/storage/v1/object/public/cangjing/yungang.jpg', cangjing_item_translations: [
        { locale: 'zh-Hans', title: '云冈石窟', summary: '北魏皇家石窟', era_label: '北魏', place_label: '山西大同', body: [{ type: 'paragraph', text: '第一段' }, { type: 'image', url: 'x' }] },
        { locale: 'zh-Hant', title: '雲岡石窟', summary: '北魏皇家石窟', era_label: '北魏', place_label: '山西大同', body: [{ type: 'paragraph', text: '第一段' }] },
      ] }])
    }
    const page = await getSharePage(url('/s/cangjing/yungang?l=zh-Hant'), 'staging', fetcher)
    expect(page.meta.title).toBe('雲岡石窟｜北魏 · 山西大同')
    expect(page.data.blocks).toEqual([{ type: 'paragraph', text: '第一段' }])
    expect(page.meta.imageUrl).toBe('https://staging.buddhachat.online/s/cangjing/yungang/card.jpg')
    expect(seen[0]).toMatch(/^https:\/\/bjswjgadnariutxibsfh\.supabase\.co\/rest\/v1\/cangjing_items\?/)
    expect(seen[0]).toContain('&status=eq.published&cangjing_item_translations.review_status=eq.reviewed')
    const simplified = await getSharePage(url('/s/cangjing/yungang'), 'staging', fetcher)
    expect(simplified.meta.title).toBe('云冈石窟｜北魏 · 山西大同')
  })

  it('answers missing for a 藏经阁 item the database does not show', async () => {
    expect((await getSharePage(url('/s/cangjing/draft-item'), 'production', async () => json([]))).status).toBe(404)
    expect((await getSharePage(url('/s/cangjing/Bad_Id'), 'production', async () => json([]))).status).toBe(404)
  })
})

describe('share cards', () => {
  it('serves the cover from a stable address', async () => {
    const fetcher = fakeFetch({
      'https://zentube.buddhachat.online/api/videos/UwWNDUfyxL9': json(VIDEO),
      'https://customer-x.cloudflarestream.com/': new Response(new Uint8Array([0xff, 0xd8, 0xff]), { headers: { 'content-type': 'image/jpeg' } }),
    })
    const card = await loadShareCard('video', 'UwWNDUfyxL9', 'production', fetcher)
    expect(card.contentType).toBe('image/jpeg')
    expect([...card.bytes]).toEqual([0xff, 0xd8, 0xff])
  })

  it('falls back to the site card for anything that is not an image', async () => {
    const fetcher = fakeFetch({
      'https://zentube.buddhachat.online/api/videos/UwWNDUfyxL9': json(VIDEO),
      'https://customer-x.cloudflarestream.com/': new Response('<html>', { headers: { 'content-type': 'text/html' } }),
    })
    expect(await loadShareCard('video', 'UwWNDUfyxL9', 'production', fetcher)).toEqual({ redirect: 'https://www.buddhachat.online/share/official-card-v1.jpg', cache: 'public, s-maxage=60' })
    expect(await loadShareCard('video', '../etc', 'production', fetcher)).toEqual({ redirect: 'https://www.buddhachat.online/share/official-card-v1.jpg' })
    expect((await loadShareCard('qa', '23', 'staging', fakeFetch({}))).redirect).toBe('https://staging.buddhachat.online/share/official-card-v1.jpg')
  })
})

describe('share page hardening (local review of #124)', () => {
  const entry = (query) => new URL(`https://www.buddhachat.online/api/page-entry?${query}`)

  it('never lets a query value take over a dedicated page', async () => {
    expect(await getSharePage(entry('page=download&path=s/sutra/x'), 'production', fakeFetch({}))).toBeNull()
    expect(await getSharePage(entry('path=s/sutra/x&path=download'), 'production', fakeFetch({}))).toBeNull()
  })

  it('answers a malformed share path as missing, never as a server error', async () => {
    for (const path of ['s/constructor/1', 's/toString/1', 's/video/short', 's/nothing']) {
      const page = await getSharePage(entry(`path=${path}`), 'production', fakeFetch({}))
      expect(page.status).toBe(404)
      expect(page.data.state).toBe('missing')
    }
  })

  it('keeps who shared it when a book goes to the reader', async () => {
    const page = await getSharePage(entry('path=s/sutra/practice-vow&r=abc123&ch=line&h=3&i=ABCDEFGH&x=1'), 'staging', fakeFetch({}))
    expect(page).toEqual({ status: 302, location: 'https://staging.buddhachat.online/sutra/s/practice-vow?r=abc123&ch=line&h=3&i=ABCDEFGH' })
  })

  it('keeps replacement sequences in content as plain text', () => {
    const html = injectShareData('<html><head></head><body></body></html>', { title: "a $& b $' c $` d" })
    expect(html).toContain("a $& b $' c $` d")
  })

  it('allows the 佛乐 artwork folder and the public 藏经阁 bucket only by path', () => {
    expect(safeImageUrl('https://www.buddhachat.online/music/assets/scene-chant.jpg')).toBe('https://www.buddhachat.online/music/assets/scene-chant.jpg')
    expect(safeImageUrl('https://bjswjgadnariutxibsfh.supabase.co/storage/v1/object/public/cangjing/a/b.jpg')).toBe('https://bjswjgadnariutxibsfh.supabase.co/storage/v1/object/public/cangjing/a/b.jpg')
    for (const bad of [
      'https://www.buddhachat.online/api/release-health',
      'https://www.buddhachat.online/music/assets/../../api/x.jpg',
      'https://staging.buddhachat.online/music/assets/scene-chant.jpg',
      'https://bjswjgadnariutxibsfh.supabase.co/rest/v1/cangjing_items',
      'https://bjswjgadnariutxibsfh.supabase.co/storage/v1/object/public/avatars/x.jpg',
    ]) {
      expect(safeImageUrl(bad)).toBeNull()
    }
  })

  it('fetches covers only from known HTTPS image hosts, cropped for the card', () => {
    expect(safeImageUrl('https://customer-ab12.cloudflarestream.com/tok/thumbnails/thumbnail.jpg?height=720&width=1280&fit=crop'))
      .toBe('https://customer-ab12.cloudflarestream.com/tok/thumbnails/thumbnail.jpg?height=630&width=1200&fit=crop')
    expect(safeImageUrl('https://yuanhui.buddhachat.online/assets/images/share/yuanhui-card-v2.jpg')).toBe('https://yuanhui.buddhachat.online/assets/images/share/yuanhui-card-v2.jpg')
    for (const bad of ['http://customer-ab12.cloudflarestream.com/x.jpg', 'https://169.254.169.254/latest', 'https://evil.example/x.jpg', 'https://customer-ab12.cloudflarestream.com:8443/x.jpg', 'https://user@yuanhui.buddhachat.online/x.jpg', null, 'not a url']) {
      expect(safeImageUrl(bad)).toBeNull()
    }
  })

  it('does not follow redirects or buffer oversized covers', async () => {
    const seen = []
    const fetcher = async (url, options) => {
      seen.push([String(url), options?.redirect])
      if (String(url).startsWith('https://zentube')) return json(VIDEO)
      return new Response('x', { headers: { 'content-type': 'image/jpeg', 'content-length': String(3 * 1024 * 1024) } })
    }
    const card = await loadShareCard('video', 'UwWNDUfyxL9', 'production', fetcher)
    expect(card.redirect).toBe('https://www.buddhachat.online/share/official-card-v1.jpg')
    expect(seen[1][1]).toBe('error')
    expect(seen[1][0]).toContain('width=1200')
  })

  it('serves a video cover with a staging fallback on staging', async () => {
    const card = await loadShareCard('video', 'UwWNDUfyxL9', 'staging', async () => { throw new Error('down') })
    expect(card).toEqual({ redirect: 'https://staging.buddhachat.online/share/official-card-v1.jpg', cache: 'public, s-maxage=60' })
  })
})
