function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () =>
      reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export function isJournalAssetRef(value) {
  return typeof value === 'string' && value.startsWith('/editor-assets/')
}

export async function saveJournalImageFile(file) {
  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('Only image uploads are supported')
  }

  if (typeof fetch !== 'function') {
    throw new Error('Image uploads require a fetch-capable environment')
  }

  const data = await readFileAsDataUrl(file)
  const response = await fetch('/__editor/upload-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: file.name,
      type: file.type,
      data,
    }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error ?? 'Failed to upload image')
  }

  const payload = await response.json()

  if (!payload?.path || typeof payload.path !== 'string') {
    throw new Error('Upload endpoint returned an invalid image path')
  }

  return payload.path
}

export async function resolveJournalImageSource(source) {
  return {
    src: source || '',
    revoke() {},
  }
}
