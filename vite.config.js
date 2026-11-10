import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import downloadSubmissionsHandler from './api/download-submissions.js'

const projectRoot = fileURLToPath(new URL('./', import.meta.url))

function createApiRouteHandler(routePath, handler) {
  return async (req, res, next) => {
    const requestUrl = new URL(req.url ?? '/', 'http://localhost')

    if (requestUrl.pathname !== routePath) {
      next()
      return
    }

    await handler(req, res)
  }
}

// 本地开发时也能调用下载登记接口（线上由 api/download-submissions.js 处理）。
// 2026-11-11 首页编辑器下线，原来的保存场景、上传图片、自动提交 git 的开发接口一并删除。
function localApiPlugin() {
  const downloadHandler = createApiRouteHandler('/api/download-submissions', downloadSubmissionsHandler)

  return {
    name: 'local-api-plugin',
    configureServer(server) {
      server.middlewares.use(downloadHandler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(downloadHandler)
    },
  }
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, projectRoot, ''))

  return {
    plugins: [react(), localApiPlugin()],
    build: {
      rollupOptions: {
        // 首页单独入口：构建时生成完整网页（scripts/prerender-home.mjs），其余页面仍走 index.html（spa.html）。
        input: {
          main: path.join(projectRoot, 'index.html'),
          home: path.join(projectRoot, 'home.html'),
        },
      },
    },
    server: {
      allowedHosts: true,
    },
    preview: {
      allowedHosts: true,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
    },
  }
})
