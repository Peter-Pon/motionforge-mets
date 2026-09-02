import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

/**
 * Browser build: the online edition and plain web previews.
 *
 * No Electron plugin, relative asset paths so the bundle can be served from
 * any directory, output kept apart from the desktop build. Run with
 * `--mode online` to pick up .env.online, which turns on the online gating in
 * src/lib/platform.ts; without it this is simply the desktop renderer in a
 * browser, handy for screenshots and tests.
 */
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5179,
    strictPort: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  }
})
