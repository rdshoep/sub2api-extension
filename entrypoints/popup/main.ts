import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import '@/styles/index.css'
import './popup.css'
import { createChromeTransport, createDirectTransport, setRpcTransport } from '@/core/messaging/client'
import { handleRpc } from '@/core/messaging/handlers'
import type { ConsoleKernel } from '@/core/kernel'

declare global {
  interface Window {
    __E2E_KERNEL__?: ConsoleKernel
  }
}

if (typeof window !== 'undefined' && window.__E2E_KERNEL__) {
  const kernel = window.__E2E_KERNEL__
  setRpcTransport(createDirectTransport((req) => handleRpc(kernel, req)))
} else {
  setRpcTransport(createChromeTransport())
}

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
