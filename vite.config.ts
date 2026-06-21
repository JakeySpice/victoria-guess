import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Served from a GitHub Pages project page at /victoria-guess/ in production,
// but from the root in dev so local previews stay at http://localhost:<port>/.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/victoria-guess/' : '/',
  plugins: [react()],
}))
