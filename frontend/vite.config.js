import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port:petlove-liart.vercel.app/,
    proxy: {
      '/api': {
        target: 'petlove-production-53ae.up.railway.app',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
