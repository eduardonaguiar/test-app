import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiBaseUrl = process.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/health': {
        target: apiBaseUrl,
        changeOrigin: true,
      },
    },
  },
});
