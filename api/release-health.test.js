import { describe, expect, it, vi } from 'vitest'

import handler from './release-health.js'
import { getReleaseHealth } from './_lib/release-health.js'

const sha = 'a'.repeat(40)
const baseEnv = {
  VERCEL_TARGET_ENV: 'staging',
  VERCEL_GIT_COMMIT_SHA: sha,
  SUPABASE_URL: 'https://staging-project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  RELEASE_EXPECTED_SUPABASE_HOST: 'staging-project.supabase.co',
}

function response() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return this },
  }
}

describe('official-site release health', () => {
  it('binds a healthy staging response to the exact deployment and database', async () => {
    const fetchImpl = vi.fn(async () => new Response('[]', { status: 200 }))
    const health = await getReleaseHealth({
      env: baseEnv,
      fetchImpl,
      now: new Date('2026-08-27T07:00:00.000Z'),
    })

    expect(health).toMatchObject({
      ok: true,
      environment: 'staging',
      sha,
      config: {
        supabaseHost: 'staging-project.supabase.co',
        expectedSupabaseHost: 'staging-project.supabase.co',
        releaseControlPlane: 'admin_settings:v1',
      },
      checks: { environmentMatches: true, supabaseMatches: true, databaseOk: true },
      checkedAt: '2026-08-27T07:00:00.000Z',
    })
    expect(health.configChecksum).toMatch(/^[a-f0-9]{64}$/)
    expect(JSON.stringify(health)).not.toContain(baseEnv.SUPABASE_SERVICE_ROLE_KEY)
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://staging-project.supabase.co/rest/v1/admin_settings?select=key&limit=1',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('fails closed when the configured Supabase environment drifts', async () => {
    const health = await getReleaseHealth({
      env: { ...baseEnv, RELEASE_EXPECTED_SUPABASE_HOST: 'production-project.supabase.co' },
      fetchImpl: async () => new Response('[]', { status: 200 }),
    })

    expect(health.ok).toBe(false)
    expect(health.checks).toMatchObject({ supabaseMatches: false, databaseOk: true })
  })

  it('returns 503 for an unhealthy deployment and never accepts writes', async () => {
    const unhealthy = response()
    await handler({ method: 'GET' }, unhealthy, {
      env: baseEnv,
      fetchImpl: async () => new Response('denied', { status: 503 }),
    })
    expect(unhealthy.statusCode).toBe(503)
    expect(unhealthy.payload.ok).toBe(false)

    const rejected = response()
    await handler({ method: 'POST' }, rejected)
    expect(rejected.statusCode).toBe(405)
  })
})
