import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const policyMarker = 'NON_BYPASSABLE_PRODUCTION_APPROVAL'

async function read(path) {
  return readFile(join(root, path), 'utf8')
}

function fail(message) {
  throw new Error(`Production release policy check failed: ${message}`)
}

const [agents, policy, androidPolicy, vercelSource, legalVercelSource, routerVercelSource, packageSource] = await Promise.all([
  read('AGENTS.md'),
  read('docs/PRODUCTION_RELEASE_POLICY.md'),
  read('docs/ANDROID_APK_RELEASE.md'),
  read('vercel.json'),
  read('legal-site/vercel.json'),
  read('master-router/vercel.json'),
  read('package.json'),
])

if (!agents.includes(policyMarker)) fail('AGENTS.md is missing the non-bypassable approval marker')
if (!agents.includes('production_accepted') || !agents.includes('promote_production')) {
  fail('AGENTS.md is missing the backend approval state/action contract')
}
if (!policy.includes('production_accepted') || !policy.includes('promote_production')) {
  fail('the canonical policy is missing the backend approval state/action contract')
}
if (!androidPolicy.includes('PRODUCTION_RELEASE_POLICY.md')) {
  fail('the Android APK runbook is not bound to the Production release policy')
}

for (const [name, source] of [
  ['vercel.json', vercelSource],
  ['legal-site/vercel.json', legalVercelSource],
  ['master-router/vercel.json', routerVercelSource],
]) {
  const deploymentEnabled = JSON.parse(source).git?.deploymentEnabled
  if (
    deploymentEnabled?.staging !== true ||
    deploymentEnabled?.['*'] !== false ||
    Object.keys(deploymentEnabled).some((branch) => !['staging', '*'].includes(branch))
  ) {
    fail(`${name} must enable Git deployment only for staging`)
  }
}

const packageJson = JSON.parse(packageSource)
if (packageJson.scripts?.['check:release-policy'] !== 'node scripts/check-production-release-policy.mjs') {
  fail('package.json must expose the canonical release-policy check')
}
if (!packageJson.scripts?.build?.includes('check-production-release-policy.mjs')) {
  fail('the production release policy check must run during every build')
}

const executableSources = [
  ['package.json scripts', JSON.stringify(packageJson.scripts ?? {})],
]

for (const directory of ['.github/workflows', 'scripts']) {
  const entries = await readdir(join(root, directory), { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const absolutePath = join(root, directory, entry.name)
    if (absolutePath === fileURLToPath(import.meta.url)) continue
    executableSources.push([relative(root, absolutePath), await readFile(absolutePath, 'utf8')])
  }
}

const forbidden = [
  /\bvercel(?:\s+deploy)?\s+--prod\b/i,
  /\bvercel\s+promote\b/i,
  /\bvercel\s+alias\s+(?:set|assign)\b/i,
  /\bvercel\s+env\s+(?:add|update|rm|remove)\s+\S+\s+production\b/i,
]

for (const [sourceName, source] of executableSources) {
  const matched = forbidden.find((pattern) => pattern.test(source))
  if (matched) fail(`${sourceName} contains a prohibited direct Production command`)
}

console.log('Production release policy guard passed: backend approval remains mandatory.')
