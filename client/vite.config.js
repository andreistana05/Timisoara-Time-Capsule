import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const SERVER = process.env.VITE_PROXY_TARGET || 'http://localhost:3001';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // allow cloudflared / ngrok hostnames (Vite blocks unknown Host headers by default)
    allowedHosts: true,
    fs: { allow: ['..'] },
    // Socket.io + REST are proxied so the phone only needs ONE https URL (the tunnel).
    proxy: {
      '/socket.io': { target: SERVER, ws: true, changeOrigin: true },
      '/api': { target: SERVER, changeOrigin: true },
    },
  },
  // three.js lives in the lazy /ar chunk on purpose
  build: { chunkSizeWarningLimit: 1200 },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true },
});
