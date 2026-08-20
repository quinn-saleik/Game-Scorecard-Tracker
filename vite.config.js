import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base so the built assets resolve correctly no matter what path
  // GitHub Pages serves the app from (e.g. https://user.github.io/repo-name/).
  base: './',
})
