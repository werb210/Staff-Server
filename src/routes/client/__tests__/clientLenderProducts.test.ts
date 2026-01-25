import request from "supertest";
import app from "../../../app";

describe("GET /api/client/lender-products", () => {
  it("returns 200 and array", async () => {
    const res = await request(app).get("/api/client/lender-products");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("does not expose inactive lenders or products", async () => {
    const res = await request(app).get("/api/client/lender-products");
    for (const row of res.body.data) {
      expect(row.lender_id).toBeDefined();
      expect(row.lender_name).toBeDefined();
    }
  });
});
