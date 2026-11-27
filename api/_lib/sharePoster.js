// 1.4.5 任务8: posters for WeChat Moments, Instagram Stories and posts, where links do not travel.
// One template for every content type: the 信笺 palette of the share pages, the content in the middle,
// and a QR code that opens the same share page (ch=poster), so attribution survives a scan.
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import qrcode from 'qrcode-generator'
import { TIMEOUT_MS } from './shareContent.js'

export const POSTER_SIZES = {
  story: { width: 1080, height: 1920 },
  feed: { width: 1080, height: 1350 },
}

const COPY = {
  zh: {
    kind: { video: '法师开示', qa: '法师答疑', yuanhui: '源慧法师 · 开示', music: '佛乐', cangjing: '藏经阁' },
    scan: '长按识别二维码',
    open: '在 BuddhaChat 打开',
    site: '一念连接，万法相伴 · buddhachat.online',
  },
  zhHant: {
    kind: { video: '法師開示', qa: '法師答疑', yuanhui: '源慧法師 · 開示', music: '佛樂', cangjing: '藏經閣' },
    scan: '長按識別二維碼',
    open: '在 BuddhaChat 打開',
    site: '一念連接，萬法相伴 · buddhachat.online',
  },
  en: {
    kind: { video: 'Dharma talk', qa: 'A master answers', yuanhui: 'Master Yuanhui', music: 'Buddhist music', cangjing: 'Buddhist culture' },
    scan: 'Scan the code',
    open: 'to open it in BuddhaChat',
    site: 'buddhachat.online',
  },
}

export function posterCopy(locale) {
  if (locale === 'zh-Hant') return COPY.zhHant
  if (locale === 'en') return COPY.en
  return COPY.zh
}

/** The QR code as an SVG data URI: black modules on the paper colour, error correction M. */
export function qrDataUri(text) {
  const qr = qrcode(0, 'M')
  qr.addData(text, 'Byte')
  qr.make()
  const count = qr.getModuleCount()
  const quiet = 2
  const size = count + quiet * 2
  let path = ''
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (qr.isDark(row, col)) path += `M${col + quiet} ${row + quiet}h1v1h-1z`
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fbf6ec"/><path d="${path}" fill="#2b2118"/></svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

/** The poster's excerpt: the answer of a question, else the first paragraphs, else the summary. */
export function posterExcerpt(content) {
  const blocks = Array.isArray(content.blocks) ? content.blocks : []
  const answer = blocks.find((block) => block.type === 'answer')
  const text = answer?.text
    ?? blocks.filter((block) => block.type === 'paragraph').map((block) => block.text).slice(0, 2).join('\n')
  const value = (text || content.summary || '').replace(/\s+/g, ' ').trim()
  return value.length > 140 ? `${value.slice(0, 139)}…` : value
}

async function googleFont(family, weight, text, fetcher) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`
  const cssResponse = await fetcher(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!cssResponse.ok) throw new Error(`poster font css ${cssResponse.status}`)
  const css = await cssResponse.text()
  const src = /src: url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\) format\('(?:truetype|opentype|woff)'\)/.exec(css)
  if (!src) throw new Error('poster font unavailable')
  const fontResponse = await fetcher(src[1], { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!fontResponse.ok) throw new Error(`poster font ${fontResponse.status}`)
  return fontResponse.arrayBuffer()
}

/** Width and height from a JPEG's frame header, or null when the bytes are not a readable JPEG. */
export function jpegSize(bytes) {
  const data = Buffer.from(bytes)
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null
  let offset = 2
  while (offset + 9 < data.length) {
    if (data[offset] !== 0xff) return null
    const marker = data[offset + 1]
    const length = data.readUInt16BE(offset + 2)
    // SOF0-SOF15 except DHT (C4), JPG (C8) and DAC (CC) carry the frame size.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) }
    }
    offset += 2 + length
  }
  return null
}

/** A cover the renderer may decode: a JPEG of at most 4096 px on each side. */
export function posterCoverOk(bytes) {
  const size = bytes ? jpegSize(bytes) : null
  return Boolean(size && size.width > 0 && size.height > 0 && size.width <= 4096 && size.height <= 4096)
}

const node = (type, style, children) => ({ type, props: { style, children } })

/** Renders a poster PNG for a loaded share page; coverBytes is the card image when there is one. */
export async function renderPoster({ content, qrUrl, size = 'story', locale, coverBytes = null, fetcher = fetch }) {
  const { width, height } = POSTER_SIZES[size] ?? POSTER_SIZES.story
  const copy = posterCopy(locale)
  const kind = `BuddhaChat · ${copy.kind[content.type] ?? ''}`
  const excerpt = posterExcerpt(content)
  const story = size !== 'feed'
  if (coverBytes && !posterCoverOk(coverBytes)) coverBytes = null
  const coverHeight = coverBytes ? (story ? 600 : 340) : 0
  const inner = width - 160

  const serifText = `${content.title}${kind}`
  const sansText = `${content.author ?? ''}${excerpt}${copy.scan}${copy.open}${copy.site}…`
  const [serif, sans] = await Promise.all([
    googleFont('Noto Serif SC', 600, serifText, fetcher),
    googleFont('Noto Sans SC', 400, sansText, fetcher),
  ])

  const children = [
    node('div', { fontSize: 34, color: '#7a5a35', letterSpacing: 2, fontFamily: 'Sans' }, kind),
  ]
  if (coverBytes) {
    children.push({
      type: 'img',
      props: {
        src: `data:image/jpeg;base64,${Buffer.from(coverBytes).toString('base64')}`,
        style: { width: inner, height: coverHeight, objectFit: 'cover', borderRadius: 28, marginTop: 40 },
      },
    })
  }
  children.push(node('div', {
    display: 'block', lineClamp: story ? 3 : 2, width: inner, wordBreak: 'break-all', fontSize: story ? 76 : 66, lineHeight: 1.35, color: '#2b2118', marginTop: 48, fontFamily: 'Serif',
  }, content.title))
  if (content.author) children.push(node('div', { width: inner, fontSize: 34, color: '#6b5a46', marginTop: 20, fontFamily: 'Sans' }, content.author))
  if (excerpt) {
    children.push(node('div', {
      display: 'block', lineClamp: story ? 6 : 3, width: inner, wordBreak: 'break-all', fontSize: 38, lineHeight: 1.65, color: '#4a3b2c', marginTop: 36, fontFamily: 'Sans',
      borderLeft: '6px solid #7a3e1d', paddingLeft: 28,
    }, excerpt))
  }
  children.push(node('div', { flexGrow: 1, display: 'flex' }, ''))
  children.push({
    type: 'div',
    props: {
      // Width counts the 32 px padding and 2 px border on each side.
      style: { display: 'flex', alignItems: 'center', width: inner - 68, background: '#fbf6ec', borderRadius: 28, padding: 32, border: '2px solid #e2d3bb', flexShrink: 0 },
      children: [
        { type: 'img', props: { src: qrDataUri(qrUrl), style: { width: 220, height: 220 } } },
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column', marginLeft: 36, width: inner - 68 - 220 - 36 },
            children: [
              node('div', { fontSize: 38, color: '#7a3e1d', fontFamily: 'Sans', lineHeight: 1.4 }, copy.scan),
              node('div', { fontSize: 32, color: '#4a3b2c', fontFamily: 'Sans', lineHeight: 1.4, marginTop: 4 }, copy.open),
              node('div', { fontSize: 28, color: '#6b5a46', fontFamily: 'Sans', marginTop: 14 }, copy.site),
            ],
          },
        },
      ],
    },
  })

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: { width, height, display: 'flex', background: '#f6eedf', position: 'relative' },
        // An inner layer pinned 80 px from every edge, so the QR card always sits inside the poster.
        children: [{ type: 'div', props: { style: { position: 'absolute', top: 80, left: 80, right: 80, bottom: 80, display: 'flex', flexDirection: 'column' }, children } }],
      },
    },
    {
      width,
      height,
      fonts: [
        { name: 'Serif', data: serif, weight: 600, style: 'normal' },
        { name: 'Sans', data: sans, weight: 400, style: 'normal' },
      ],
    },
  )
  return new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng()
}
