import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import '@/styles/index.css'
import { createChromeTransport, setRpcTransport } from '@/core/messaging/client'

setRpcTransport(createChromeTransport())
const app = createApp(App)
app.use(createPinia())
app.mount('#app')
