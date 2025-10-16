import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/staff-audit/',     // ✅ required for GitHub Pages deployment
  plugins: [
    react()
    // rollupGuard() // DISABLED to fix build issues
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0',
    hmr: { overlay: false },
    proxy: {
      '/api': 'http://localhost:5000'
    }
  },
  build: { 
    sourcemap: false,
    rollupOptions: {
      external: [],
      output: {
        manualChunks: undefined
      }
    }
  },
  optimizeDeps: {
    include: ['lucide-react'],
    force: true
  }
})
