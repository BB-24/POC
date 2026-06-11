import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/upload': 'http://localhost:8000',
      '/summary': 'http://localhost:8000',
      '/ips': 'http://localhost:8000',
      '/protocols': 'http://localhost:8000',
      '/flows': 'http://localhost:8000',
      '/logs': 'http://localhost:8000',
    },
  },
})
