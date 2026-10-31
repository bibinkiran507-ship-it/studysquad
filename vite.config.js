import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (id.includes('/motion/') || id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('socket.io-client') || id.includes('engine.io-client') || id.includes('axios')) {
            return 'vendor-network'
          }
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) {
            return 'vendor-react'
          }
          return undefined
        },
      },
    },
  },
})
