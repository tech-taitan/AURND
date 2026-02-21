import { vi } from 'vitest'

export function setSystemTime(isoString: string) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(isoString))
}

export function resetSystemTime() {
  vi.useRealTimers()
}
