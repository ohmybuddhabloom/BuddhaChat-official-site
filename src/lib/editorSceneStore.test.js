import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadProjectScene, saveProjectScene } from './editorSceneStore.js'

describe('editorSceneStore', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads a saved project scene when the file exists', async () => {
    const scene = { visual: { imageSrc: '/editor-assets/example.png' } }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => scene,
      })),
    )

    await expect(loadProjectScene()).resolves.toEqual(scene)
  })

  it('returns null when the project scene file is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
      })),
    )

    await expect(loadProjectScene()).resolves.toBeNull()
  })

  it('posts the current scene to the editor save endpoint', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
    }))
    vi.stubGlobal('fetch', fetchSpy)

    const scene = { quote: { x: 16, y: -24 } }
    await saveProjectScene(scene)

    expect(fetchSpy).toHaveBeenCalledWith(
      '/__editor/save-scene',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scene),
      }),
    )
  })
})
