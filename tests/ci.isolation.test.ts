import { describe, it, expect, vi } from "vitest";
import { applyEnv, captureOriginalEnv, restoreEnv, unsetEnv } from "../test/utils/testEnv";

describe("CI isolation invariants", () => {
  it("blocks outbound network calls", () => {
    expect(() => global.fetch("https://example.com")).toThrow("NETWORK_CALL_BLOCKED");
  });

  it("keeps real DB execution gated in CI and rejects missing DATABASE_URL", async () => {
    const originalEnv = captureOriginalEnv();
    applyEnv({ CI: "true" });
    expect(process.env.CI).toBe("true");

    unsetEnv(["DATABASE_URL"]);

    try {
      const { runQuery } = await import("../src/lib/db");
      await expect(runQuery("SELECT 1")).rejects.toThrow("DB_POOL_NOT_INITIALIZED");
    } finally {
      restoreEnv(originalEnv);
    }
  });

  it("prevents module cache bleed across resetModules", async () => {
    const firstImport = await import("../src/config/env");
    (firstImport as unknown as { __testMarker?: string }).__testMarker = "persisted";

    vi.resetModules();

    const secondImport = await import("../src/config/env");
    expect((secondImport as unknown as { __testMarker?: string }).__testMarker).toBeUndefined();
  });

  it("allows env overrides and full restore through helper", () => {
    const originalEnv = captureOriginalEnv();

    applyEnv({ JWT_SECRET: "isolated-test-secret", PORT: "9090" });

    expect(process.env.JWT_SECRET).toBe("isolated-test-secret");
    expect(process.env.PORT).toBe("9090");

    restoreEnv(originalEnv);

    expect(process.env.JWT_SECRET).toBe(originalEnv.JWT_SECRET);
    expect(process.env.PORT).toBe(originalEnv.PORT);
  });
});
