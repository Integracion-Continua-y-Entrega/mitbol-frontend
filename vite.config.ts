import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const backendUrl = env.VITE_API_BASE_URL?.trim()
    || env.VITE_API_URL?.trim()
    || 'https://mitbol-backend.onrender.com'

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      proxy: {
        '/backend': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/backend(?=\/|$)/, ''),
          proxyTimeout: 90_000,
        },
      },
    },
  }
})
