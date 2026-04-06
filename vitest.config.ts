// FIX: provide env for CI tests BEFORE app imports
process.env.JWT_SECRET ||= "test_jwt_secret_12345678901234567890";
process.env.OPENAI_API_KEY ||= "test_openai_key";
process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test";
process.env.NODE_ENV ||= "test";

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  esbuild: {
    tsconfigRaw: require("./tsconfig.test.json"),
  },
});
