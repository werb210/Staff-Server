import request from "supertest";
import { buildAppWithApiRoutes } from "../app";
const app = buildAppWithApiRoutes();

beforeAll(async () => {
  process.env.DATABASE_URL = "pg-mem";
  process.env.JWT_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
  process.env.JWT_EXPIRES_IN = "1h";
  process.env.JWT_REFRESH_EXPIRES_IN = "1d";
  process.env.NODE_ENV = "test";
});

describe("auth routes never return 500", () => {
  it("rejects auth requests without 500s", async () => {
    const responses = await Promise.all([
      request(app).post("/api/auth/otp/start").send({ phone: "invalid" }),
      request(app).post("/api/auth/otp/verify").send({ phone: "invalid", code: "" }),
      request(app).post("/api/auth/start").send({ phone: "invalid" }),
      request(app).post("/api/auth/verify").send({ phone: "invalid", code: "" }),
      request(app).post("/api/auth/refresh").send({}),
      request(app).post("/api/auth/logout").send({}),
      request(app).post("/api/auth/logout-all").send({}),
      request(app).get("/api/auth/me"),
    ]);

    responses.forEach((res) => {
      expect(res.status).not.toBe(500);
    });
  });
});
