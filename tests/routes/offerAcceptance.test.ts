// BF_SERVER_v75_BLOCK_1_8
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { pool } from "../../src/db.js";
import router from "../../src/routes/offerAcceptance";

const queryMock = vi.spyOn(pool, "query");

function app() {
  const a = express();
  a.use(express.json());
  a.use(router);
  return a;
}

beforeEach(() => {
  queryMock.mockReset();
});

afterEach(() => {
  queryMock.mockReset();
});

describe("offer acceptance routes", () => {
  it("POST /:id/accept stages -> pending_acceptance", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: "OFF1", status: "pending_acceptance" }] } as any);
    const r = await request(app()).post("/OFF1/accept").send({});
    expect(r.status).toBe(200);
    expect(r.body.offer.status).toBe("pending_acceptance");
  });

  it("POST /:id/accept returns 409 if offer cannot be staged", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as any);
    const r = await request(app()).post("/OFFX/accept").send({});
    expect(r.status).toBe(409);
    expect(r.body.error).toBe("offer_not_acceptable");
  });
});
