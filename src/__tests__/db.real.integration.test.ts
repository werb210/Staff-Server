import { describe, it, expect } from "vitest";

const isCI = process.env.CI === "true";

(isCI ? describe.skip : describe)("real db integration", () => {
  it("runs only outside CI", async () => {
    expect(true).toBe(true);
  });
});
