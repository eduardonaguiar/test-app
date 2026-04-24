/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiBaseUrl = env.VITE_API_BASE_URL ?? 'http://localhost:8080';
  const basePath = env.VITE_WEB_BASE_PATH && env.VITE_WEB_BASE_PATH.trim().length > 0 ? env.VITE_WEB_BASE_PATH : '/';

  return {
    plugins: [react()],
    base: basePath,
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      globals: true,
    },
  };
});
