import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mdx()],
  server: {
  // Pin dev port to 5174 (CORS allowed in API); change here if needed
  port: 5174,
    proxy: {
      // Forward API calls to ASP.NET backend in dev to avoid CORS
      '/api': {
        target: 'https://localhost:7069',
        changeOrigin: true,
        secure: false,
      },
      // Static files served by API (images from posts)
      '/static': {
        target: 'https://localhost:7069',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
