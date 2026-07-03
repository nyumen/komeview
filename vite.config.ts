import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  root: resolve(__dirname, 'src/app'),
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  server: {
    // wait-on が 127.0.0.1 を監視するため IPv4 に固定（環境によって ::1 のみで待ち受けて詰まるのを防ぐ）
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
})
