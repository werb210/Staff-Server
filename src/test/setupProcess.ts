import { vi } from 'vitest'

vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
  throw new Error(`process.exit called with ${code}`)
})

console.log('[PROCESS EXIT BLOCKED]')
