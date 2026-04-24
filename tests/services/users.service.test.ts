import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../src/db.js";
import { logger } from "../../src/server/utils/logger.js";
import { fetchMe } from "../../src/services/users.service.js";

describe("fetchMe", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns user row when query resolves", async () => {
    const row = {
      id: "u1",
      phone: "123",
      email: "a@b.com",
      first_name: "a",
      last_name: "b",
      role: "Admin",
      status: "ACTIVE",
      silo: "BF",
      profile_image_url: null,
      o365_access_token: null,
      created_at: null,
      updated_at: null,
      last_login_at: null,
    };
    vi.spyOn(db, "query").mockResolvedValue({ rows: [row] } as any);

    const result = await fetchMe({ user: { userId: "u1" } } as any);

    expect(result).toMatchObject({ id: "u1" });
  });

  it("returns null and does not throw when query rejects due to missing column", async () => {
    vi.spyOn(db, "query").mockRejectedValue(new Error("column profile_image_url does not exist"));
    const loggerSpy = vi.spyOn(logger, "error").mockImplementation(() => undefined as any);

    await expect(fetchMe({ user: { userId: "u1" } } as any)).resolves.toBeNull();
    expect(loggerSpy).toHaveBeenCalled();
  });
});
