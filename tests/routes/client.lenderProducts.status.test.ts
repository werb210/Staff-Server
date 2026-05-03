import request from "supertest";
import { createApp } from "../../src/app.js";

describe("BF_SERVER_BLOCK_v83 — /api/client/lender-products exposes status", () => {
  it("returns status:'active' on every row when active=true filter is in effect", async () => {
    const app = createApp();
    const r = await request(app).get("/api/client/lender-products");
    expect(r.status).toBe(200);
    const rows = r.body?.data ?? [];
    if (rows.length > 0) {
      for (const row of rows) {
        expect(row.status).toBe("active");
        expect(row.active).toBe(true);
      }
    }
  });
});
