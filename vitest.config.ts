import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    hookTimeout: 60000,
    testTimeout: 60000,
    setupFiles: ["./src/__tests__/setup.ts"],
    environment: "node",
    globals: true,
    clearMocks: true,
    restoreMocks: true,
  },
});
