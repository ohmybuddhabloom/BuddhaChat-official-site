import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const projectRoot = fileURLToPath(new URL('./', import.meta.url))
const editorAssetsDir = path.join(projectRoot, 'public', 'editor-assets')
const editorStateDir = path.join(projectRoot, 'public', 'editor-state')
const editorSceneFile = path.join(editorStateDir, 'scene.json')

function sanitizeFileName(fileName) {
  const parsed = path.parse(fileName || 'upload.png')
  const safeName = (parsed.name || 'upload')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'upload'
  const safeExtension = (parsed.ext || '.png').replace(/[^.a-zA-Z0-9]+/g, '')

  return `${safeName}${safeExtension || '.png'}`
}

function createEditorAssetHandler() {
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

function createEditorSceneHandler() {
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
  const handler = createEditorAssetHandler()
  const sceneHandler = createEditorSceneHandler()

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
