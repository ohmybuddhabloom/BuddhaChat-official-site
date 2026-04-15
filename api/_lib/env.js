export function getRequiredEnv(name) {
  const value = globalThis.process?.env?.[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function getOptionalEnv(name, fallback = null) {
  return globalThis.process?.env?.[name] ?? fallback
}
