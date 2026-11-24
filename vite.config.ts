import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    define: {
      // The site key is public; the Turnstile secret is never injected here.
      'import.meta.env.VITE_TURNSTILE_SITE_KEY': JSON.stringify(env.TURNSTILE_SITE_KEY ?? ''),
    },
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/backend': {
          target: 'http://localhost',
          changeOrigin: true,
          rewrite: (path) => `/bookify${path}`,
        },
        '/uploads': {
          target: 'http://localhost',
          changeOrigin: true,
          rewrite: (path) => `/bookify${path}`,
        },
      },
    },
  }
})
