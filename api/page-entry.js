import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { SACRED_STORIES_BY_SLUG } from '../src/content/sacredStories.js'

const ORIGIN = 'https://www.buddhachat.online'
const SITE_NAME = 'BuddhaChat'
const DEFAULT_DESCRIPTION =
  'BuddhaChat connects Buddhist video teachings, scripture reading, music, and community in one calm digital space.'

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

  return {
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    canonicalUrl: `${ORIGIN}/`,
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
    <meta property="og:locale" content="zh_CN" />
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

export default async function handler(req, res) {
  const url = new URL(req.url, ORIGIN)
  const indexHtml = await readFile(
    path.join(process.cwd(), 'dist/spa.html'),
    'utf8',
  )

  res.statusCode = 200
  res.setHeader('content-type', 'text/html; charset=utf-8')
  res.setHeader(
    'cache-control',
    'public, s-maxage=300, stale-while-revalidate=86400',
  )
  res.end(injectPageMeta(indexHtml, getPageMeta(url)))
}
