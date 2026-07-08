import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' makes the build use relative asset paths so it works
// out of the box on GitHub Pages (project pages live under /repo-name/).
export default defineConfig({
  plugins: [react()],
  base: './',
})
