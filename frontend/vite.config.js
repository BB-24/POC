import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/upload': 'http://localhost:8001',
      '/summary': 'http://localhost:8001',
      '/ips': 'http://localhost:8001',
      '/protocols': 'http://localhost:8001',
      '/flows': 'http://localhost:8001',
      '/logs': 'http://localhost:8001',
      '/stats': 'http://localhost:8001',
    },
  },
})
