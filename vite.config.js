import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const projectRoot = fileURLToPath(new URL('./', import.meta.url))
const editorAssetsDir = path.join(projectRoot, 'public', 'editor-assets')
const editorStateDir = path.join(projectRoot, 'public', 'editor-state')
const editorSceneFile = path.join(editorStateDir, 'scene.json')
const editorSyncTargets = ['public/editor-assets', 'public/editor-state']

function sanitizeFileName(fileName) {
  const parsed = path.parse(fileName || 'upload.png')
  const safeName = (parsed.name || 'upload')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'upload'
  const safeExtension = (parsed.ext || '.png').replace(/[^.a-zA-Z0-9]+/g, '')

  return `${safeName}${safeExtension || '.png'}`
}

function runGitCommand(args) {
  const result = spawnSync('git', args, {
    cwd: projectRoot,
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || `git ${args.join(' ')} failed`)
  }

  return result.stdout?.trim() ?? ''
}

function createGitSyncScheduler() {
  let syncTimer = null
  let syncInFlight = false
  let queued = false

  const runSync = () => {
    if (syncInFlight) {
      queued = true
      return
    }

    syncInFlight = true

    try {
      const status = runGitCommand([
        'status',
        '--porcelain',
        '--',
        ...editorSyncTargets,
      ])

      if (!status) {
        return
      }

      runGitCommand(['add', ...editorSyncTargets])
      runGitCommand(['commit', '-m', 'chore: sync editor assets'])

      const currentBranch = runGitCommand(['branch', '--show-current']) || 'main'
      runGitCommand(['push', 'origin', currentBranch])
    } catch (error) {
      console.error('[editor-assets-plugin] Git sync failed:', error)
    } finally {
      syncInFlight = false

      if (queued) {
        queued = false
        syncTimer = setTimeout(runSync, 4000)
      }
    }
  }

  return () => {
    if (syncTimer) {
      clearTimeout(syncTimer)
    }

    syncTimer = setTimeout(runSync, 8000)
  }
}

function createEditorAssetHandler(scheduleGitSync) {
  return async (req, res, next) => {
    if (req.method !== 'POST' || req.url !== '/__editor/upload-image') {
      next()
      return
    }

    let rawBody = ''

    req.on('data', (chunk) => {
      rawBody += chunk
    })

    req.on('end', async () => {
      try {
        const payload = JSON.parse(rawBody || '{}')
        const { data, name, type } = payload

        if (
          typeof name !== 'string' ||
          typeof type !== 'string' ||
          typeof data !== 'string' ||
          !type.startsWith('image/') ||
          !data.startsWith(`data:${type};base64,`)
        ) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Invalid image upload payload' }))
          return
        }

        const base64Body = data.slice(data.indexOf(',') + 1)
        const fileBuffer = Buffer.from(base64Body, 'base64')
        const timeStamp = new Date().toISOString().replace(/[:.]/g, '-')
        const safeFileName = sanitizeFileName(name)
        const finalFileName = `${timeStamp}-${safeFileName}`

        fs.mkdirSync(editorAssetsDir, { recursive: true })
        fs.writeFileSync(path.join(editorAssetsDir, finalFileName), fileBuffer)
        scheduleGitSync()

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(
          JSON.stringify({
            path: `/editor-assets/${finalFileName}`,
          }),
        )
      } catch (error) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(
          JSON.stringify({
            error: error instanceof Error ? error.message : 'Upload failed',
          }),
        )
      }
    })
  }
}

function createEditorSceneHandler(scheduleGitSync) {
  return async (req, res, next) => {
    if (req.method !== 'POST' || req.url !== '/__editor/save-scene') {
      next()
      return
    }

    let rawBody = ''

    req.on('data', (chunk) => {
      rawBody += chunk
    })

    req.on('end', async () => {
      try {
        const payload = JSON.parse(rawBody || '{}')

        fs.mkdirSync(editorStateDir, { recursive: true })
        fs.writeFileSync(editorSceneFile, JSON.stringify(payload, null, 2))
        scheduleGitSync()

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true }))
      } catch (error) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(
          JSON.stringify({
            error: error instanceof Error ? error.message : 'Scene save failed',
          }),
        )
      }
    })
  }
}

function editorAssetsPlugin() {
  const scheduleGitSync = createGitSyncScheduler()
  const handler = createEditorAssetHandler(scheduleGitSync)
  const sceneHandler = createEditorSceneHandler(scheduleGitSync)

  return {
    name: 'editor-assets-plugin',
    configureServer(server) {
      server.middlewares.use(handler)
      server.middlewares.use(sceneHandler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
      server.middlewares.use(sceneHandler)
    },
  }
}

export default defineConfig({
  plugins: [react(), editorAssetsPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
})
