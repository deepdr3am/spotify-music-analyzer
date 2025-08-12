import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/login': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/callback': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/logout': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
