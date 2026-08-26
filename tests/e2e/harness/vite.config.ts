import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

const root = dirname(fileURLToPath(import.meta.url))
const repo = resolve(root, '../../..')

export default defineConfig({
  root,
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(repo, 'src'),
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss({ config: resolve(repo, 'tailwind.config.ts') }), autoprefixer()],
    },
  },
  server: {
    port: 4177,
    strictPort: true,
  },
})
