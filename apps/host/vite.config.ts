import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const HOST_PORT = parseInt(process.env.XEMD_HOST_PORT ?? '6600', 10);
const API_PORT  = parseInt(process.env.XEMD_API_PORT  ?? '3001', 10);

export default defineConfig({
  plugins: [react()],
  server: {
    port: HOST_PORT,
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
      '/sdk': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
      '/widgets': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
