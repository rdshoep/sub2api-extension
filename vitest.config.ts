import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(root, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      ['tests/component/**', 'happy-dom'],
    ],
    setupFiles: ['tests/setup.ts'],
    include: ['tests/unit/**/*.spec.ts', 'tests/component/**/*.spec.ts', 'tests/contract/**/*.spec.ts'],
    reporters: ['default'],
  },
})
