import { ConsoleKernel } from '@/core/kernel'
import { TypedHttpClient } from '@/core/http/client'
import { memoryStorage } from '@/core/security/storage'
import { createMockFetch } from '../mocks/mock-fetch'

export function createTestKernel(opts: { betaDown?: boolean } = {}) {
  const local = memoryStorage()
  const session = memoryStorage()
  const kernel = new ConsoleKernel({
    local,
    session,
    permissions: {
      async request() {
        return true
      },
      async contains() {
        return true
      },
    },
    http: new TypedHttpClient({ fetchImpl: createMockFetch(opts) }),
  })
  return { kernel, local, session }
}
