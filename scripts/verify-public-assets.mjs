import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourceRoot = join(projectRoot, 'src')
const publicRoot = join(projectRoot, 'public')
const sourceExtensions = new Set(['.css', '.js', '.jsx', '.ts', '.tsx'])
const imageReference = /\/[A-Za-z0-9_@./-]+\.(?:avif|gif|jpe?g|png|svg|webp)/gi

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    if (!sourceExtensions.has(extname(entry.name))) return []
    if (/\.test\.[^.]+$/.test(entry.name)) return []
    return [path]
  })
}

const references = new Map()

for (const sourceFile of sourceFiles(sourceRoot)) {
  const source = readFileSync(sourceFile, 'utf8')
  for (const match of source.matchAll(imageReference)) {
    const publicPath = match[0]
    if (publicPath.startsWith('//')) continue
    const owners = references.get(publicPath) ?? []
    owners.push(relative(projectRoot, sourceFile))
    references.set(publicPath, owners)
  }
}

const invalidAssets = [...references.entries()].filter(([publicPath]) => {
  const assetPath = join(publicRoot, publicPath.slice(1))
  return !existsSync(assetPath) || statSync(assetPath).size === 0
})

if (invalidAssets.length > 0) {
  console.error('Refusing to build because referenced public image assets are missing:')
  for (const [publicPath, owners] of invalidAssets) {
    console.error(`- ${publicPath} (referenced by ${owners.join(', ')})`)
  }
  process.exit(1)
}

console.log(`Verified ${references.size} referenced public image assets.`)
