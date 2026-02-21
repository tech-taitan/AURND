type EnvMap = Record<string, string | undefined>

type EnvSnapshot = Record<string, string | undefined>

function snapshotEnv(keys: string[]): EnvSnapshot {
  const snapshot: EnvSnapshot = {}
  for (const key of keys) {
    snapshot[key] = process.env[key]
  }
  return snapshot
}

function restoreEnv(snapshot: EnvSnapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

export function withTempEnv(overrides: EnvMap, fn: () => void) {
  const keys = Object.keys(overrides)
  const snapshot = snapshotEnv(keys)

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  try {
    fn()
  } finally {
    restoreEnv(snapshot)
  }
}
