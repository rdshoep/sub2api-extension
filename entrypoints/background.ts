import { ConsoleKernel } from '@/core/kernel'
import { handleRpc } from '@/core/messaging/handlers'
import { webextStorage } from '@/core/security/storage'
import { createWebextPermissions } from '@/core/security/permissions'
import type { RpcRequest } from '@/core/messaging/protocol'

export default defineBackground(() => {
  const kernel = new ConsoleKernel({
    local: webextStorage('local'),
    session: webextStorage('session'),
    permissions: createWebextPermissions(),
  })

  browser.runtime.onMessage.addListener((message: RpcRequest, _sender, sendResponse) => {
    handleRpc(kernel, message).then(sendResponse)
    return true
  })
})
