import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { SACRED_STORIES_BY_SLUG } from '../src/content/sacredStories.js'
import { readSharePath, readShareParams, SHARE_HOST_HEADER, shareEnvironmentFor, shareLinks } from '../src/lib/sharePage.js'
import { getPublicOrigin, PUBLIC_ORIGINS } from './_lib/public-origin.js'
import { loadShareContent, shareCardUrl, sharePosterUrl } from './_lib/shareContent.js'

const ORIGIN = 'https://www.buddhachat.online'
const SITE_NAME = 'BuddhaChat'
const DEFAULT_TITLE = 'BuddhaChat｜一念连接，万法相伴'
const DEFAULT_DESCRIPTION =
  '佛经全文、白话解释、大师朗读、法师开示视频与冥想佛乐，在 BuddhaChat 一站连接。'

const STORY_IMAGES = {
  'children-of-scripture': '/share/children-of-scripture-card-v1.jpg',
  'journey-of-amethyst': '/share/journey-of-amethyst-card-v1.jpg',
  'a-life-in-thangka': '/share/a-life-in-thangka-card-v1.jpg',
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const absoluteUrl = (pathname) => new URL(pathname, ORIGIN).toString()

const isDownloadPage = (url) =>
  url.searchParams.get('page') === 'download' ||
  url.pathname === '/download' ||
  url.pathname === '/download/' ||
  url.pathname === '/download/yuanhui'

const isEnglishDownloadPage = (url) =>
  url.searchParams.get('page') === 'download-en' ||
  url.pathname === '/download/en' ||
  url.searchParams.get('path') === 'download/en'

const isJoinInvitePage = (url) => {
  const rewrittenPath = url.searchParams.get('path')?.trim()
  const sourcePath = rewrittenPath ? `/${rewrittenPath.replace(/^\/+/, '')}` : url.pathname
  return sourcePath === '/join' || sourcePath.startsWith('/join/')
}

const isLampInvitePage = (url) => {
  const rewrittenPath = url.searchParams.get('path')?.trim()
  const sourcePath = rewrittenPath ? `/${rewrittenPath.replace(/^\/+/, '')}` : url.pathname
  return sourcePath === '/lamp' || sourcePath.startsWith('/lamp/')
}

const isYuanhuiGuidePage = (url) =>
  url.searchParams.get('page') === 'guide-yuanhui' ||
  url.pathname === '/guide/yuanhui' ||
  url.pathname === '/guide/yuanhui/'

const canonicalPathFromUrl = (url) => {
  const rewrittenPath = url.searchParams.get('path')?.trim()
  const isInternalHomeEntry =
    url.pathname === '/api/page-entry' &&
    url.searchParams.get('page') === 'home'

  if (isInternalHomeEntry) {
    return `${ORIGIN}/`
  }

  const sourcePath = rewrittenPath
    ? `/${rewrittenPath.replace(/^\/+/, '')}`
    : url.pathname
  const normalizedUrl = new URL(sourcePath || '/', ORIGIN)
  const normalizedPath =
    normalizedUrl.pathname === '/'
      ? '/'
      : normalizedUrl.pathname.replace(/\/+$/, '')

  return `${ORIGIN}${normalizedPath}`
}

export function getPageMeta(url) {
  const storySlug = url.searchParams.get('story')?.trim()
  const story = storySlug ? SACRED_STORIES_BY_SLUG[storySlug] : null

  if (story) {
    return {
      title: story.title,
      description: story.summary,
      canonicalUrl: `${ORIGIN}/?story=${encodeURIComponent(story.slug)}`,
      imageUrl: absoluteUrl(STORY_IMAGES[story.slug]),
      type: 'article',
    }
  }

  if (isEnglishDownloadPage(url)) {
    return {
      title: 'Download BuddhaChat | One Mindful Connection, Boundless Dharma by Your Side',
      description:
        'Scriptures, Dharma talks, meditation music, and daily practice—all together in BuddhaChat.',
      canonicalUrl: `${ORIGIN}/download/en`,
      imageUrl: absoluteUrl('/share/download-card-v1.jpg'),
      type: 'website',
      locale: 'en_US',
    }
  }

  if (isDownloadPage(url)) {
    return {
      title: '下载 BuddhaChat｜一念连接，万法相伴',
      description:
        '经书、法师开示视频、冥想佛乐与每日修行，一站汇聚在 BuddhaChat。',
      canonicalUrl: `${ORIGIN}/download`,
      imageUrl: absoluteUrl('/share/download-card-v1.jpg'),
      type: 'website',
    }
  }

  if (isJoinInvitePage(url)) {
    // Invite links are mostly forwarded in WeChat: the card should say what it is, and must not
    // index one canonical page per invite code.
    return {
      title: '道场邀请｜一起在 BuddhaChat 共修',
      description: '有同修邀请你加入 BuddhaChat 道场，一起念诵、打卡、交流。',
      canonicalUrl: `${ORIGIN}/download`,
      imageUrl: absoluteUrl('/share/download-card-v1.jpg'),
      type: 'website',
    }
  }

  if (isLampInvitePage(url)) {
    // 传灯 links are forwarded in WeChat (Owner 2026-11-22): the card names the lamp, not one page per code.
    return {
      title: '一位师兄为你点亮了一盏灯｜BuddhaChat',
      description: '诸恶莫作，众善奉行，自净其意，是诸佛教。千余位法师的开示，十二种语言，分文不取。',
      canonicalUrl: `${ORIGIN}/download`,
      imageUrl: absoluteUrl('/share/lamp-card-v1.jpg'),
      type: 'website',
    }
  }

  if (isYuanhuiGuidePage(url)) {
    return {
      title: 'BuddhaChat 手机端使用指南｜从扫码到源慧法师专区',
      description:
        '从官方下载、安装和首次使用，到每日修行及进入源慧法师专区，跟着指南一步一步完成。',
      canonicalUrl: `${ORIGIN}/guide/yuanhui`,
      imageUrl: absoluteUrl('/share/download-card-v1.jpg'),
      type: 'article',
    }
  }

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonicalUrl: canonicalPathFromUrl(url),
    imageUrl: absoluteUrl('/share/official-card-v1.jpg'),
    type: 'website',
  }
}

const stripExistingMeta = (head) =>
  head
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<meta\s+name="description"[^>]*>\s*/gi, '')
    .replace(/\s*<link\s+rel="canonical"[^>]*>\s*/gi, '')
    .replace(/\s*<meta\s+property="og:[^"]+"[^>]*>\s*/gi, '')
    .replace(/\s*<meta\s+name="twitter:[^"]+"[^>]*>\s*/gi, '')

export function injectPageMeta(html, meta) {
  const title = escapeHtml(meta.title)
  const description = escapeHtml(meta.description)
  const canonicalUrl = escapeHtml(meta.canonicalUrl)
  const imageUrl = escapeHtml(meta.imageUrl)
  const tags = `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="${escapeHtml(meta.type)}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="${escapeHtml(meta.locale ?? 'zh_CN')}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:url" content="${imageUrl}" />
    <meta property="og:image:secure_url" content="${imageUrl}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${title}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta name="twitter:image:alt" content="${title}" />`

  return html.replace(/<head>([\s\S]*?)<\/head>/i, (_match, head) => {
    return `<head>${tags}${stripExistingMeta(head)}</head>`
  })
}

const SHARE_LOCALES = { 'zh-Hans': 'zh_CN', 'zh-Hant': 'zh_TW', en: 'en_US' }

/**
 * Share pages arrive only through the site-wide catch-all rewrite (`?path=s/...`) or directly. A
 * dedicated page (download, guides) carries `page=` and must never be taken over by a query value.
 */
const sharePathOf = (url) => {
  if (url.searchParams.has('page')) return null
  const rewritten = url.searchParams.getAll('path')
  if (rewritten.length > 1) return null
  if (rewritten.length === 1) return `/${rewritten[0].trim().replace(/^\/+/, '')}`
  return url.pathname
}

const SHARE_PARAM_KEYS = ['r', 'ch', 'h', 'i', 'l']

/**
 * 1.4.5 share pages, /s/<type>/<id>: the card a chat app shows comes from the content itself, and the
 * page receives the same content so it renders without a second request. A missing item answers 404
 * with the plain site card; an unreachable source still answers the page, which then explains itself.
 */
export async function getSharePage(url, environmentName, fetcher = fetch, shareHost = null) {
  const sourcePath = sharePathOf(url)
  if (!sourcePath?.startsWith('/s/')) return null
  const env = shareEnvironmentFor(environmentName, shareHost)
  const share = readSharePath(sourcePath)
  if (share?.asset) return null
  const params = readShareParams(url.search)
  if (!share) {
    // An unknown type or a malformed id is a missing page, not a temporary failure.
    return {
      status: 404,
      cache: 'public, s-maxage=60',
      meta: { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, canonicalUrl: `${env.site}/download`, imageUrl: `${env.site}/share/official-card-v1.jpg`, type: 'website' },
      data: { state: 'missing', params, links: { downloadUrl: `${env.site}/download` } },
    }
  }
  const links = shareLinks(env, share.type, share.id, params)
  links.cardUrl = shareCardUrl(links.canonical)
  links.posterUrl = sharePosterUrl(links.page)
  // The scripture reader already owns a share page with its own card; the share values travel along.
  if (share.type === 'sutra') {
    const target = new URL(`${env.site}/sutra/s/${encodeURIComponent(share.id)}`)
    for (const key of SHARE_PARAM_KEYS) if (params[key] !== undefined) target.searchParams.set(key, String(params[key]))
    return { status: 302, location: target.toString() }
  }
  const fallbackMeta = {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonicalUrl: links.canonical,
    imageUrl: `${env.site}/share/official-card-v1.jpg`,
    type: 'website',
    locale: SHARE_LOCALES[params.l],
  }
  let content
  try {
    content = await loadShareContent(share.type, share.id, env, fetcher, params)
  } catch {
    return { status: 200, cache: 'public, s-maxage=30', meta: fallbackMeta, data: { type: share.type, id: share.id, params, links, state: 'unavailable' } }
  }
  if (!content) {
    return { status: 404, cache: 'public, s-maxage=60', meta: fallbackMeta, data: { type: share.type, id: share.id, params, links, state: 'missing' } }
  }
  return {
    status: 200,
    // Short stale window: a removed question or article must stop showing within minutes.
    cache: 'public, s-maxage=300, stale-while-revalidate=600',
    meta: {
      title: content.author ? `${content.title}｜${content.author}` : content.title,
      description: content.summary || DEFAULT_DESCRIPTION,
      canonicalUrl: links.canonical,
      imageUrl: content.imageUrl ? links.cardUrl : `${env.site}/share/official-card-v1.jpg`,
      type: content.media?.kind === 'video' ? 'video.other' : 'article',
      locale: SHARE_LOCALES[params.l],
    },
    data: { ...content, params, links, state: 'ready' },
  }
}

export function injectShareData(html, data) {
  // `<` is escaped so content text can never close the script element.
  const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
  // A callback keeps `$&`, `$'` and friends in the content from acting as replacement patterns.
  return html.replace(/<\/head>/i, () => `<script>window.__BC_SHARE__=${json}</script></head>`)
}

export default async function handler(req, res) {
  const url = new URL(req.url, ORIGIN)
  const indexHtml = await readFile(
    path.join(process.cwd(), 'dist/spa.html'),
    'utf8',
  )

  res.setHeader('content-type', 'text/html; charset=utf-8')
  const share = await getSharePage(
    url,
    getPublicOrigin(req) === PUBLIC_ORIGINS.staging ? 'staging' : 'production',
    fetch,
    req.headers?.[SHARE_HOST_HEADER],
  )
  // Pages opened on the backup share domain carry links on it: they are cached apart.
  if (share) res.setHeader('vary', SHARE_HOST_HEADER)
  if (share?.location) {
    res.statusCode = share.status
    res.setHeader('location', share.location)
    res.setHeader('cache-control', 'public, s-maxage=300')
    res.end()
    return
  }
  if (share) {
    res.statusCode = share.status
    res.setHeader('cache-control', share.cache)
    res.end(injectShareData(injectPageMeta(indexHtml, share.meta), share.data))
    return
  }

  res.statusCode = 200
  res.setHeader(
    'cache-control',
    'public, s-maxage=300, stale-while-revalidate=86400',
  )
  res.end(injectPageMeta(indexHtml, getPageMeta(url)))
}
