#!/usr/bin/env node
// 官网性能测试台（防回退检查）。对比两个地址，在同样条件下测“打开速度”和“滑动是否掉帧”。
//
//   node scripts/perf/bench.cjs --a https://www.buddhachat.online/ --b http://127.0.0.1:8802/ [--rounds 5] [--json out.json]
//   node scripts/perf/bench.cjs --serve dist --port 8802      # 起一个与线上缓存行为一致的本地服务（不设 no-store）
//
// 依赖 Playwright 和 Chromium，但不进仓库依赖：用 PLAYWRIGHT_MODULE 指向已有安装，CHROMIUM 指向浏览器。
// 规则：b 相对 a，首屏、最大内容、其余资源完成任一项变慢超过 10%，或滑动掉帧率高出 2 个百分点，退出码 1。
const http = require('http')
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, all) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : '1'])
    return acc
  }, []),
)

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2' }

function serve(root, port) {
  http
    .createServer((req, res) => {
      const [rawPath, query = ''] = req.url.split('?')
      const urlPath = decodeURIComponent(rawPath)
      // 与 vercel.json 一致：首页（不带 ?story=）走构建时生成的 home.html
      const isHome = urlPath === '/' && !/(^|&)story=/.test(query) && fs.existsSync(path.join(root, 'home.html'))
      let file = path.join(root, isHome ? 'home.html' : urlPath)
      if (!file.startsWith(path.resolve(root)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        const index = path.join(file, 'index.html')
        file = fs.existsSync(index) ? index : path.join(root, fs.existsSync(path.join(root, 'spa.html')) ? 'spa.html' : 'index.html')
      }
      const type = TYPES[path.extname(file)] || 'application/octet-stream'
      const headers = { 'Content-Type': type, 'Cache-Control': /\/assets\//.test(urlPath) ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate' }
      // 和线上一样压缩文本类文件，否则脚本、样式的传输量没法和正式环境比
      if (/text|javascript|json|svg/.test(type) && /gzip/.test(req.headers['accept-encoding'] || '')) {
        res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip' })
        fs.createReadStream(file).pipe(zlib.createGzip()).pipe(res)
        return
      }
      res.writeHead(200, headers)
      fs.createReadStream(file).pipe(res)
    })
    .listen(port, '127.0.0.1', () => console.log(`本地服务 ${root} → http://127.0.0.1:${port}/`))
}

if (args.serve) {
  serve(path.resolve(args.serve), Number(args.port || 8802))
  return
}

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.HOME, 'bb-admin-markets/node_modules/playwright'))
const CHROMIUM = process.env.CHROMIUM || path.join(process.env.HOME, 'Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
const ROUNDS = Number(args.rounds || 5)
const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' }
const DESKTOP = { viewport: { width: 1440, height: 900 } }
const HERO = /scroll-(video|frames)/

const median = (xs) => {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
  return v.length ? v[Math.floor(v.length / 2)] : null
}

async function loadOnce(browser, url, device, mbps) {
  const ctx = await browser.newContext(device)
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: mbps * 125000, uploadThroughput: 1000000 })
  const t0 = Date.now()
  const done = []
  page.on('requestfinished', async (r) => {
    try {
      const s = await r.sizes()
      done.push({ u: r.url(), t: Date.now() - t0, b: s.responseBodySize + s.responseHeadersSize, type: r.resourceType() })
    } catch {}
  })
  await page.addInitScript(() => {
    new PerformanceObserver((l) => {
      const e = l.getEntries()
      window.__lcp = e[e.length - 1].startTime
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    const t = performance.now()
    ;(function w() {
      // 新首页：data-hero-ready 在第一帧真正显示后才出现；旧首页：.hero-scroll-figure.is-ready
      const ready = document.querySelector('[data-hero-ready="1"], .hero-scroll-figure.is-ready:not(.home-buddha)')
      if (ready) window.__heroReady = performance.now() - t
      else requestAnimationFrame(w)
    })()
  })
  await page.goto(url, { waitUntil: 'load', timeout: 120000 })
  await page.waitForTimeout(15000)
  const m = await page.evaluate(() => ({
    fcp: (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime,
    lcp: window.__lcp,
    heroReady: window.__heroReady,
  }))
  const own = done.filter((r) => !HERO.test(r.u) && !/^blob:|\/api\/|analytics/.test(r.u))
  await ctx.close()
  return {
    fcp: Math.round(m.fcp),
    lcp: Math.round(m.lcp),
    otherDone: Math.max(...own.map((r) => r.t)),
    heroReady: m.heroReady ? Math.round(m.heroReady) : null,
    kb: Math.round(done.reduce((s, r) => s + r.b, 0) / 1024),
    jsKb: Math.round(done.filter((r) => r.type === 'script').reduce((s, r) => s + r.b, 0) / 1024),
    slowest: own.sort((a, b) => b.t - a.t).slice(0, 2).map((r) => `${r.t} ${r.u.split('/').pop()}`),
  }
}

// 滑动：用浏览器真实的滚动手势（合成线程滚动），CPU 降速 4 倍模拟中端手机；记录每帧间隔。
async function scrollOnce(browser, url, device, cpu) {
  const ctx = await browser.newContext(device)
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  await page.goto(url, { waitUntil: 'load', timeout: 120000 })
  await page.waitForTimeout(6000)
  await page.evaluate(() => window.dispatchEvent(new Event('scroll')))
  await page.waitForFunction(() => document.querySelector('.hero-scroll-figure.is-ready'), null, { timeout: 30000 }).catch(() => {})
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
  await page.evaluate(() => {
    window.__frames = []
    window.__loaf = 0
    try {
      new PerformanceObserver((l) => (window.__loaf += l.getEntries().filter((e) => e.duration > 50).length)).observe({ type: 'long-animation-frame' })
    } catch {}
    let last = performance.now()
    ;(function f(now) {
      window.__frames.push(now - last)
      last = now
      window.__raf = requestAnimationFrame(f)
    })(last)
  })
  const { width, height } = device.viewport
  for (let i = 0; i < 2; i++) {
    await cdp.send('Input.synthesizeScrollGesture', { x: width / 2, y: height * 0.6, yDistance: -2400, speed: 1600, gestureSourceType: device.isMobile ? 'touch' : 'mouse' })
    await cdp.send('Input.synthesizeScrollGesture', { x: width / 2, y: height * 0.4, yDistance: 2400, speed: 1600, gestureSourceType: device.isMobile ? 'touch' : 'mouse' })
  }
  const r = await page.evaluate(() => {
    cancelAnimationFrame(window.__raf)
    const f = window.__frames.slice(1)
    return { frames: f.length, dropped: f.filter((x) => x > 20).length, worst: Math.round(Math.max(...f)), loaf: window.__loaf }
  })
  await ctx.close()
  return { droppedPct: Math.round((r.dropped / Math.max(r.frames, 1)) * 1000) / 10, worst: r.worst, longFrames: r.loaf }
}

async function measure(browser, url) {
  const out = {}
  for (const [name, device, mbps] of [['手机 4Mbps', MOBILE, 4], ['手机 9Mbps', MOBILE, 9], ['电脑 9Mbps', DESKTOP, 9]]) {
    const runs = []
    for (let i = 0; i < ROUNDS; i++) runs.push(await loadOnce(browser, url, device, mbps))
    out[name] = Object.fromEntries(['fcp', 'lcp', 'otherDone', 'heroReady', 'kb', 'jsKb'].map((k) => [k, median(runs.map((r) => r[k]))]))
    out[name].slowest = runs[0].slowest
  }
  for (const [name, device, cpu] of [['手机滑动 CPU÷4', MOBILE, 4], ['电脑滑动', DESKTOP, 1]]) {
    const runs = []
    for (let i = 0; i < Math.max(3, Math.ceil(ROUNDS / 2)); i++) runs.push(await scrollOnce(browser, url, device, cpu))
    out[name] = Object.fromEntries(['droppedPct', 'worst', 'longFrames'].map((k) => [k, median(runs.map((r) => r[k]))]))
  }
  return out
}

;(async () => {
  const browser = await chromium.launch({ headless: false, executablePath: CHROMIUM })
  const a = await measure(browser, args.a)
  const b = args.b ? await measure(browser, args.b) : null
  await browser.close()
  const LABEL = { fcp: '首屏', lcp: '最大内容', otherDone: '其余资源完成', heroReady: '佛像可动', kb: '总传输KB', jsKb: '脚本KB', droppedPct: '掉帧%', worst: '最长一帧', longFrames: '长帧数' }
  let fail = false
  for (const scene of Object.keys(a)) {
    const cells = Object.keys(LABEL).filter((k) => k in a[scene]).map((k) => {
      const va = a[scene][k]
      const vb = b?.[scene]?.[k]
      if (b && ['fcp', 'lcp', 'otherDone'].includes(k) && va && vb > va * 1.1 + 100) fail = true
      if (b && k === 'droppedPct' && vb > va + 2) fail = true
      return `${LABEL[k]} ${va}${b ? ` → ${vb}` : ''}`
    })
    console.log(`${scene}：${cells.join('，')}`)
  }
  if (args.json) fs.writeFileSync(args.json, JSON.stringify({ a: args.a, b: args.b, at: new Date().toISOString(), resultA: a, resultB: b }, null, 2))
  if (b) console.log(fail ? '结论：变差，不能合并' : '结论：未变差')
  process.exit(fail ? 1 : 0)
})()
