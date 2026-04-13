import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  resolveJournalImageSource,
  saveJournalImageFile,
} from './journalAssetStore.js'

describe('journalAssetStore', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uploads image files through the editor endpoint and returns a project asset path', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ path: '/editor-assets/uploaded-image.png' }),
    })

    const path = await saveJournalImageFile(
      new File(['image'], 'uploaded-image.png', { type: 'image/png' }),
    )

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/__editor/upload-image',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const [, request] = globalThis.fetch.mock.calls[0]
    const payload = JSON.parse(request.body)

    expect(payload.name).toBe('uploaded-image.png')
    expect(payload.type).toBe('image/png')
    expect(payload.data).toMatch(/^data:image\/png;base64,/)
    expect(path).toBe('/editor-assets/uploaded-image.png')
  })

  it('passes through project image sources without extra processing', async () => {
    const resolved = await resolveJournalImageSource('/editor-assets/hero.png')

    expect(resolved.src).toBe('/editor-assets/hero.png')
    expect(typeof resolved.revoke).toBe('function')
  })
})
