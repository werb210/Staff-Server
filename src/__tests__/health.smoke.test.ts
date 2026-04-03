import request from "supertest";
import { app } from "../app";

describe("Health check", () => {
  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");

    expect(res.body).toEqual({ status: "ok", data: {} });
  });
});
