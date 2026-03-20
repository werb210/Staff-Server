import { vi } from 'vitest'

vi.mock('twilio', () => {
  return {
    default: function () {
      return {
        verify: {
          services: () => ({
            verifications: {
              create: async () => ({ sid: 'mock-verification' })
            },
            verificationChecks: {
              create: async () => ({ status: 'approved' })
            }
          })
        }
      }
    }
  }
})

console.log('[TWILIO MOCK ACTIVE]')
