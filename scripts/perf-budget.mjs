// 构建后的性能预算（防回退检查）。超标即退出码 1，持续集成里在 npm run build 之后运行。
// 2026-11-11 首页重做时定的上限；要放宽请在合并请求里写明理由并附 scripts/perf/bench.cjs 的对比数字。
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import path from 'node:path'

const dist = path.resolve('dist')
const kb = (bytes) => Math.round(bytes / 1024)
const gz = (file) => gzipSync(readFileSync(file)).length
const failures = []
const report = []

function check(label, actual, limit, unit = 'KB') {
  report.push(`${actual <= limit ? '通过' : '超标'}  ${label}：${actual} ${unit}（上限 ${limit} ${unit}）`)
  if (actual > limit) failures.push(label)
}

// 1. 首页必须是构建时生成的完整网页，而不是空壳
const homePath = path.join(dist, 'home.html')
if (!existsSync(homePath)) {
  failures.push('dist/home.html 不存在')
} else {
  const home = readFileSync(homePath, 'utf8')
  const hasContent = /Place a question into the hush\./.test(home) && /class="hero-title"/.test(home)
  report.push(`${hasContent ? '通过' : '失败'}  首页已在构建时生成正文`)
  if (!hasContent) failures.push('首页没有预先生成的正文')

  // 2. 首页加载的脚本和样式（含模块预加载），按压缩后计
  const refs = [...home.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map((match) => match[1])
  const unique = [...new Set(refs)]
  const jsGz = unique.filter((ref) => ref.endsWith('.js')).reduce((sum, ref) => sum + gz(path.join(dist, ref)), 0)
  const cssGz = unique.filter((ref) => ref.endsWith('.css')).reduce((sum, ref) => sum + gz(path.join(dist, ref)), 0)
  check('首页脚本（压缩后）', kb(jsGz), 90)
  check('首页样式（压缩后）', kb(cssGz), 30)

  // 3. 首页不能再引用第三方字体样式表（会阻塞首屏）
  const thirdPartyFonts = /fonts\.googleapis\.com/.test(home)
  report.push(`${thirdPartyFonts ? '失败' : '通过'}  首页不加载谷歌字体`)
  if (thirdPartyFonts) failures.push('首页引用了谷歌字体')
}

// 4. 首页图片与字体：单个文件上限
for (const [dir, limit] of [['home', 220], ['fonts', 40]]) {
  const full = path.join(dist, dir)
  if (!existsSync(full)) continue
  for (const name of readdirSync(full)) {
    const size = kb(statSync(path.join(full, name)).size)
    if (size > limit) check(`${dir}/${name}`, size, limit)
  }
}
report.push('通过  首页图片单张 ≤ 220 KB、字体单个 ≤ 40 KB（只列出超标项）')

// 5. 首页佛像视频第一段（一滑就要用到）
const firstSegment = path.join(dist, 'kling-buddha-scroll-video/v2/m-a.mp4')
if (existsSync(firstSegment)) check('手机版佛像视频第一段', kb(statSync(firstSegment).size), 700)

console.log(report.join('\n'))
if (failures.length) {
  console.error(`\n性能预算未通过：${failures.join('、')}`)
  process.exit(1)
}
console.log('\n性能预算全部通过')
