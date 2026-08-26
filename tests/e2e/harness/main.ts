import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '../../../entrypoints/popup/App.vue'
import '@/styles/index.css'
import { ConsoleKernel } from '@/core/kernel'
import { TypedHttpClient } from '@/core/http/client'
import { memoryStorage, webStorage } from '@/core/security/storage'
import { createDirectTransport, setRpcTransport } from '@/core/messaging/client'
import { handleRpc } from '@/core/messaging/handlers'
import { createMockFetch } from '../../mocks/mock-fetch'

const params = new URLSearchParams(location.search)
const betaDown = params.get('betaDown') === '1'

const kernel = new ConsoleKernel({
  local: webStorage('localStorage'),
  session: memoryStorage(),
  permissions: {
    async request() {
      return true
    },
    async contains() {
      return true
    },
  },
  http: new TypedHttpClient({ fetchImpl: createMockFetch({ betaDown }) }),
})

window.__E2E_KERNEL__ = kernel
setRpcTransport(createDirectTransport((req) => handleRpc(kernel, req)))

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
