const buckets = new Map()

function pruneBucket(now) {
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt <= now) {
      buckets.delete(key)
    }
  }
}

export function consumeRateLimit({
  key,
  limit,
  windowMs,
}) {
  const now = Date.now()
  pruneBucket(now)

  const current = buckets.get(key)

  if (!current || current.resetAt <= now) {
    const next = {
      count: 1,
      resetAt: now + windowMs,
    }

    buckets.set(key, next)

    return {
      ok: true,
      remaining: limit - 1,
      resetAt: next.resetAt,
    }
  }

  if (current.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: current.resetAt,
    }
  }

  current.count += 1

  return {
    ok: true,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
  }
}
