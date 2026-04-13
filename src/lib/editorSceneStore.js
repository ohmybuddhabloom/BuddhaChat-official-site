export const PROJECT_SCENE_PATH = '/editor-state/scene.json'

export async function loadProjectScene() {
  if (typeof fetch !== 'function') {
    return null
  }

  try {
    const response = await fetch(PROJECT_SCENE_PATH, {
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch {
    return null
  }
}

export async function saveProjectScene(scene) {
  if (typeof fetch !== 'function') {
    return
  }

  const response = await fetch('/__editor/save-scene', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(scene),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error ?? 'Failed to save scene')
  }
}
