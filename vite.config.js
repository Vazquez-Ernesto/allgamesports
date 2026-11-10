import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages no sabe que esto es una SPA: si alguien entra directo a
// /juego/freedoom-1 devuelve 404. El truco estándar es que 404.html sea una
// copia de index.html, así React Router resuelve la ruta en el navegador.
function spaFallback() {
  let outDir = 'dist'
  return {
    name: 'spa-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'))
    },
  }
}

// BASE_PATH lo define el workflow de GitHub Pages ("/nombre-del-repo/").
// En desarrollo y con dominio propio es "/".
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), spaFallback()],
})
