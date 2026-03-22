import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.js'
    ],
    exclude: [
      'node_modules',
      'dist',
      'test-endpoints.js',
      'vitest.config.ts',
      'src/test/**'
    ],
    environment: 'node',
    globals: true
  }
});
