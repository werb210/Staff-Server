import { describe, it, expect } from "vitest";

describe("seed module ESM compatibility", () => {
  it("exports seedAdminUser without throwing", async () => {
    const seed = await import("../db/seed.js");
    expect(typeof seed.seedAdminUser).toBe("function");
    expect(typeof seed.seedDatabase).toBe("function");
    expect(typeof seed.SEEDED_ADMIN_PHONE).toBe("string");
  });

  it("SEEDED_ADMIN_PHONE matches E.164 format", async () => {
    const { SEEDED_ADMIN_PHONE, SEEDED_ADMIN2_PHONE } = await import("../db/seed.js");
    const E164 = /^\+1\d{10}$/;
    expect(E164.test(SEEDED_ADMIN_PHONE)).toBe(true);
    expect(E164.test(SEEDED_ADMIN2_PHONE)).toBe(true);
  });
});
