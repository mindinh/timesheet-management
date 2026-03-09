import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '/docs': path.resolve(__dirname, '../../docs'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4004',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // Strip WWW-Authenticate so browser never shows its native Basic Auth dialog.
            // Auth is handled by the FE user-switcher (Authorization header in httpClient.js).
            delete proxyRes.headers['www-authenticate']
          })
        },
      },
    },
    fs: {
      allow: [
        // Allow serving files from project root and docs folder
        path.resolve(__dirname),
        path.resolve(__dirname, '../../docs'),
      ],
    },
  },
})
// Force restart
