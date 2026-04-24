import { defineConfig } from 'vite';
import { externalModules } from './vite.base.config';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/preload.ts',
      formats: ['cjs'],
      fileName: () => 'preload.js',
    },
    rollupOptions: {
      external: externalModules,
    },
  },
});
