import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["server/server/src/__tests__/**/*.test.ts"],
    globals: true
  }
});
