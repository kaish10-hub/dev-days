import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Set base path for GitHub Pages project site. Uses VITE_BASE env override if provided.
  base: process.env.VITE_BASE || '/dev-days/',
  plugins: [react()],
  server: { port: 5173 }
})
