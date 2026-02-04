import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    clearMocks: true,
    setupFiles: ["src/test/setup.ts"],
    include: ["src/test/e2e/**/*.e2e.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["node_modules", "dist"],
    },
  },
});
