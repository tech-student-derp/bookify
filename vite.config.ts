import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    proxy: {
      // Vite dev server is at localhost:5173
      // XAMPP Apache is at localhost:80
      // The PHP files live at: htdocs/test-php/bookify/backend/...
      // Apache serves them at: http://localhost/test-php/bookify/backend/...
      // So we rewrite /backend → /test-php/bookify/backend
      '/backend': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => `/test-php/bookify${path}`,
      }
    }
  }
})
