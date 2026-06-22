import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    sourcemap: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('firebase')) return 'firebase'
          if (id.includes('node_modules/react-dom')) return 'react-dom'
          if (id.includes('node_modules/react')) return 'react'
          if (id.includes('node_modules/lucide-react')) return 'icons'
        },
      },
    },
  },
})
