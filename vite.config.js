import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // Ensures relative asset paths so it runs on both GitHub Pages and Netlify
  plugins: [react()],
})
