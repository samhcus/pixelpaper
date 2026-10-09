import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
export default defineConfig(({ mode }) => ({
  define: { 'import.meta.env.VITE_DOWNLOAD_HOME': JSON.stringify(mode === 'site') },
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173, strictPort: true, proxy: {
    '/api': 'http://127.0.0.1:3001', '/wallpapers': 'http://127.0.0.1:3001', '/generated': 'http://127.0.0.1:3001'
  } }
}))
