import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const EXPECTED_PACKAGE = 'com.chriskevin.buddhachat'
const EXPECTED_CERT_SHA1 = 'ccb2d8b5ac9961499ade9b4f3013cb718cd7dd0e'
const BUCKET = 'cos://buddha-tokyo-1300001083'

function fail(message) {
  console.error(message)
  process.exit(1)
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  })

  if (result.error) fail(`${command}: ${result.error.message}`)
  if (result.status !== 0) {
    if (options.capture && result.stderr) console.error(result.stderr.trim())
    process.exit(result.status ?? 1)
  }

  return result.stdout || ''
}

function findBuildTool(name) {
  const sdkRoot =
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    join(homedir(), 'Library', 'Android', 'sdk')
  const buildToolsRoot = join(sdkRoot, 'build-tools')

  if (!existsSync(buildToolsRoot)) fail(`Android build-tools not found: ${buildToolsRoot}`)

  const versions = readdirSync(buildToolsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))

  for (const version of versions) {
    const executable = join(buildToolsRoot, version, name)
    if (existsSync(executable)) return executable
  }

  fail(`${name} not found under ${buildToolsRoot}`)
}

function findCoscli() {
  const configured = process.env.COSCLI_BIN
  if (configured && existsSync(configured)) return configured

  const local = join(homedir(), '.local', 'bin', 'coscli')
  if (existsSync(local)) return local

  const probe = spawnSync('command', ['-v', 'coscli'], {
    encoding: 'utf8',
    shell: true,
  })
  const fromPath = probe.stdout?.trim()
  if (probe.status === 0 && fromPath) return fromPath

  fail('coscli not found; set COSCLI_BIN or install it in ~/.local/bin')
}

const apkArgument = process.argv[2]
if (!apkArgument) {
  fail('Usage: npm run publish:android-apk -- /absolute/path/BuddhaChat.apk')
}

const apkPath = resolve(apkArgument)
if (!existsSync(apkPath)) fail(`APK not found: ${apkPath}`)

const aapt = findBuildTool('aapt')
const apksigner = findBuildTool('apksigner')
const coscli = findCoscli()

const badging = run(aapt, ['dump', 'badging', apkPath], { capture: true })
const packageLine = badging.split('\n').find((line) => line.startsWith('package:'))
const packageName = packageLine?.match(/name='([^']+)'/)?.[1]
const versionCode = packageLine?.match(/versionCode='([^']+)'/)?.[1]
const versionName = packageLine?.match(/versionName='([^']+)'/)?.[1]

if (packageName !== EXPECTED_PACKAGE) {
  fail(`Refusing upload: expected package ${EXPECTED_PACKAGE}, found ${packageName || 'unknown'}`)
}
if (!versionCode || !versionName) fail('Refusing upload: APK version metadata is missing')

const certificates = run(apksigner, ['verify', '--print-certs', apkPath], { capture: true })
const certificateSha1 = certificates
  .match(/certificate SHA-1 digest: ([a-fA-F0-9]+)/)?.[1]
  ?.toLowerCase()

if (certificateSha1 !== EXPECTED_CERT_SHA1) {
  fail('Refusing upload: APK is not signed with the BuddhaChat Android upload key')
}

const safeVersionName = versionName.replace(/[^a-zA-Z0-9._-]/g, '-')
const releaseName = `BuddhaChat-${safeVersionName}-${versionCode}.apk`
const releaseObject = `${BUCKET}/apk/releases/${releaseName}`
const latestObject = `${BUCKET}/apk/BuddhaChat-latest.apk`

run(coscli, [
  'cp',
  apkPath,
  releaseObject,
  '--meta',
  `Content-Type:application/vnd.android.package-archive#Cache-Control:public,max-age=31536000,immutable#Content-Disposition:attachment; filename="${releaseName}"`,
  '--disable-log',
])

run(coscli, [
  'cp',
  apkPath,
  latestObject,
  '--meta',
  `Content-Type:application/vnd.android.package-archive#Cache-Control:no-store,no-cache,must-revalidate#Content-Disposition:attachment; filename="${releaseName}"`,
  '--disable-log',
])

const sha256 = createHash('sha256').update(readFileSync(apkPath)).digest('hex')
console.log(`Published ${basename(apkPath)} as ${releaseName}`)
console.log(`Package: ${packageName}`)
console.log(`Version: ${versionName} (${versionCode})`)
console.log(`SHA-256: ${sha256}`)
console.log('Stable URL: https://www.buddhachat.online/download/android/latest.apk')
