import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Shared Zod schemas + inferred types imported by both packages
      '@budgetfoyer/shared': resolve(import.meta.dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    proxy: {
      '/demo/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: false,
  },
});
