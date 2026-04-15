function readStreamBody(req) {
  return new Promise((resolve, reject) => {
    let rawBody = ''

    req.on('data', (chunk) => {
      rawBody += chunk
    })

    req.on('end', () => {
      resolve(rawBody)
    })

    req.on('error', reject)
  })
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body
  }

  const rawBody = await readStreamBody(req)

  if (!rawBody) {
    return {}
  }

  try {
    return JSON.parse(rawBody)
  } catch {
    throw new Error('Request body must be valid JSON')
  }
}

export function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

export function sendMethodNotAllowed(res, allowed = ['POST']) {
  res.setHeader('Allow', allowed.join(', '))
  sendJson(res, 405, {
    ok: false,
    error: 'Method not allowed',
  })
}

export function sendError(res, statusCode, error, details = undefined) {
  sendJson(res, statusCode, {
    ok: false,
    error,
    details,
  })
}
