import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: { port: 5173 },
  // No publicar el código fuente original junto al bundle.
  build: { sourcemap: false },
  // En producción se quitan console/debugger para no filtrar detalles internos
  // (los errores siguen mostrándose en la interfaz). En `dev` se conservan.
  esbuild: command === 'build' ? { drop: ['console', 'debugger'] } : {},
}))
