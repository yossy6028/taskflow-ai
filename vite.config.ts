import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4000,
    host: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
      '@shared': path.resolve(__dirname, './src/shared')
    }
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    sourcemap: true
  }
})