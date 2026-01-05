import request from "supertest";
import { buildApp, defaultConfig } from "../index";

const app = buildApp(defaultConfig);

describe("smoke", () => {
  it("responds to health checks", async () => {
    const res = await request(app).get("/api/_int/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
