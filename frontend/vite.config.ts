import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fameatBanner } from './plugins/banner'
import fs from 'fs'

// Solo HTTPS si se pasa --https o VITE_HTTPS=true
const wantHttps = process.argv.includes('--https') || process.env.VITE_HTTPS === 'true';
const certExists = fs.existsSync('cert.pem') && fs.existsSync('key.pem');
const httpsConfig = wantHttps && certExists
  ? { key: fs.readFileSync('key.pem'), cert: fs.readFileSync('cert.pem') }
  : undefined;

export default defineConfig({
  plugins: [react(), tailwindcss(), fameatBanner()],
  clearScreen: false,
  server: {
    port: 5173,
    host: true,
    hmr: true,
    https: httpsConfig,
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        configure: (proxy) => {
          proxy.on('error', () => {});
          proxy.on('close', () => {});
          proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
            socket.on('error', () => {});
            socket.on('close', () => {});
          });
          proxy.on('proxyRes', (_proxyRes, _req, res) => {
            res.on('error', () => {});
          });
        },
      },
    },
  },
})
