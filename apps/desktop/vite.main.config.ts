import { defineConfig } from 'vite';
import { externalModules } from './vite.base.config';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/main.ts',
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      external: externalModules,
    },
  },
});
