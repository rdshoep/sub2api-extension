import type { PlatformConnection } from '@/domain/models'
import type { DeepLinks } from '@/core/adapters/types'

/** Routes confirmed in `frontend/src/router/index.ts`. No guessed `:id` detail paths. */
export function getSub2ApiDeepLinks(connection: PlatformConnection): DeepLinks {
  const origin = connection.origin.replace(/\/+$/, '')
  return {
    dashboard: `${origin}/admin/dashboard`,
    accounts: `${origin}/admin/accounts`,
    users: `${origin}/admin/users`,
    ops: `${origin}/admin/ops`,
    usage: `${origin}/admin/usage`,
  }
}
