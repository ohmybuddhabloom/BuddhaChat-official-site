import { createHash } from 'node:crypto'

function hostOf(value) {
  try {
    return new URL(String(value ?? '')).host
  } catch {
    return null
  }
}

function deploymentEnvironment(env) {
  const target = String(env.VERCEL_TARGET_ENV ?? env.VERCEL_ENV ?? '').toLowerCase()
  if (target === 'staging' || env.VERCEL_GIT_COMMIT_REF === 'staging') return 'staging'
  if (target === 'production') return 'production'
  return target || 'development'
}

async function probeDatabase(env, fetchImpl) {
  const supabaseUrl = String(env.SUPABASE_URL ?? '').replace(/\/+$/, '')
  const serviceRoleKey = String(env.SUPABASE_SERVICE_ROLE_KEY ?? '')
  if (!supabaseUrl || !serviceRoleKey) return false

  try {
    const response = await fetchImpl(`${supabaseUrl}/rest/v1/admin_settings?select=key&limit=1`, {
      method: 'GET',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      signal: AbortSignal.timeout(5_000),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function getReleaseHealth({
  env = globalThis.process?.env ?? {},
  fetchImpl = fetch,
  now = new Date(),
} = {}) {
  const environment = deploymentEnvironment(env)
  const config = {
    environment,
    supabaseHost: hostOf(env.SUPABASE_URL),
    expectedSupabaseHost: String(env.RELEASE_EXPECTED_SUPABASE_HOST ?? '').trim().toLowerCase(),
    releaseControlPlane: 'admin_settings:v1',
  }
  const checks = {
    environmentMatches: ['staging', 'production'].includes(environment),
    supabaseMatches: Boolean(
      config.supabaseHost
      && config.expectedSupabaseHost
      && config.supabaseHost.toLowerCase() === config.expectedSupabaseHost,
    ),
    databaseOk: await probeDatabase(env, fetchImpl),
  }

  return {
    ok: checks.environmentMatches && checks.supabaseMatches && checks.databaseOk,
    environment,
    sha: String(env.VERCEL_GIT_COMMIT_SHA ?? '').toLowerCase() || null,
    config,
    configChecksum: createHash('sha256').update(JSON.stringify(config)).digest('hex'),
    checks,
    databaseError: checks.databaseOk ? null : 'release_database_check_failed',
    checkedAt: now.toISOString(),
  }
}
