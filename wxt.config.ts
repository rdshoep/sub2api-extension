import { defineConfig } from 'wxt'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  srcDir: 'src',
  entrypointsDir: '../entrypoints',
  outDir: '.output',
  vite: () => ({
    resolve: {
      alias: {
        '@': resolve(root, 'src'),
      },
    },
  }),
  manifest: {
    default_locale: 'en',
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    version: '1.0.0',
    permissions: ['storage'],
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    action: {
      default_title: '__MSG_extName__',
      default_icon: {
        16: '/icon/16.png',
        32: '/icon/32.png',
        48: '/icon/48.png',
        128: '/icon/128.png',
      },
    },
    icons: {
      16: '/icon/16.png',
      32: '/icon/32.png',
      48: '/icon/48.png',
      128: '/icon/128.png',
    },
  },
})
