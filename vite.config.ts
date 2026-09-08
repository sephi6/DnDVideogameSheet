import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: { port: 5173 },
  // Do not ship the original source alongside the bundle.
  build: { sourcemap: false },
  // In production console/debugger are dropped so internal details do not leak
  // (errors are still shown in the interface). In `dev` they are kept.
  esbuild: command === 'build' ? { drop: ['console', 'debugger'] } : {},
}))
