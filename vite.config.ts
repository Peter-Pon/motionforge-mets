import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron']
            }
          },
          define: {
            'process.env.NODE_ENV': '"production"'
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      }
    ]),
    renderer()
  ],
  // Fold the online switch to a literal in the desktop build. Without this,
  // IS_ONLINE stays `import.meta.env.VITE_CYCLEVIEW_ONLINE === '1'` — a runtime
  // comparison the bundler cannot see through, so every online-only component
  // (and the QR library behind it) ships inside the Electron app unreachable.
  define: {
    'import.meta.env.VITE_CYCLEVIEW_ONLINE': 'undefined'
  },
  server: {
    port: 5178,
    strictPort: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  }
})