import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.ts", "src/**/*.test.ts", "src/**/*.test.js"],
    exclude: ["node_modules", "dist", "test-endpoints.js", "src/test/**"],
    globals: true,
  },
});
