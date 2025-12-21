import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["server/src/__tests__/**/*.test.ts"]
  }
});
