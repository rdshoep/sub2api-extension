export interface PermissionsApi {
  request(origins: string[]): Promise<boolean>
  contains(origins: string[]): Promise<boolean>
}

export function createWebextPermissions(): PermissionsApi {
  return {
    async request(origins) {
      const api = (globalThis as { browser?: any; chrome?: any }).browser ?? (globalThis as { chrome?: any }).chrome
      if (!api?.permissions?.request) return true
      return api.permissions.request({ origins })
    },
    async contains(origins) {
      const api = (globalThis as { browser?: any; chrome?: any }).browser ?? (globalThis as { chrome?: any }).chrome
      if (!api?.permissions?.contains) return true
      return api.permissions.contains({ origins })
    },
  }
}

export async function requestExactOrigin(permissions: PermissionsApi, hostPermissionOrigin: string): Promise<void> {
  const granted = await permissions.request([hostPermissionOrigin])
  if (!granted) {
    throw Object.assign(new Error('Host permission was not granted for this origin'), { code: 'PERMISSION_DENIED' })
  }
}
