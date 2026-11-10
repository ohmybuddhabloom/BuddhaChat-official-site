// 构建后把首页渲染成完整 HTML，写进 dist/home.html（访客打开就有内容，不用等脚本）。
// 同时写入分享标题等元信息（原来每次访问都由 api/page-entry.js 现填）。
import { execFileSync } from 'node:child_process'
import { readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getPageMeta, injectPageMeta } from '../api/page-entry.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ssrDir = path.join(root, 'dist-ssr-home')

execFileSync('npx', ['vite', 'build', '--ssr', 'src/home/server.jsx', '--outDir', ssrDir, '--emptyOutDir', '--logLevel', 'warn'], {
  cwd: root,
  stdio: 'inherit',
})

const { renderHome } = await import(pathToFileURL(path.join(ssrDir, 'server.js')).href)
const htmlPath = path.join(root, 'dist', 'home.html')
const template = await readFile(htmlPath, 'utf8')
if (!template.includes('<!--home-html-->')) {
  throw new Error('dist/home.html 里找不到 <!--home-html--> 占位，首页没有生成')
}
const body = renderHome()
const meta = getPageMeta(new URL('https://www.buddhachat.online/api/page-entry?page=home'))
await writeFile(htmlPath, injectPageMeta(template.replace('<!--home-html-->', body), meta))
await rm(ssrDir, { recursive: true, force: true })
console.log(`首页已生成：dist/home.html（正文 ${Math.round(body.length / 1024)} KB）`)
