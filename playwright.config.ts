import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: process.env.API_BASE_URL || 'http://localhost:5000',
    extraHTTPHeaders: {
      'Content-Type': 'application/json'
    }
  }
});
