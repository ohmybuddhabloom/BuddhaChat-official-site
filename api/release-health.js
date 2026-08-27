import { getReleaseHealth } from './_lib/release-health.js'

export default async function handler(req, res, options) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const health = await getReleaseHealth(options)
  return res.status(health.ok ? 200 : 503).json(health)
}
