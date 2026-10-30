import { defineConfig } from 'vitest/config';

// Explicit ESM configuration for Vitest 5 / Vite's native config loader.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
