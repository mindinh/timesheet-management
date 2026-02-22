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
