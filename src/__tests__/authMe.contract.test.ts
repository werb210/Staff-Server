import jwt from "jsonwebtoken";
import request from "supertest";
import { buildAppWithApiRoutes } from "../app";
import { pool } from "../db";
import { ROLES } from "../auth/roles";

const app = buildAppWithApiRoutes();

describe("auth me contract", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "test-access-secret";
  });

  it("accepts a valid JWT with role", async () => {
    const querySpy = jest.spyOn(pool, "query");
    const token = jwt.sign(
      { sub: "user-1", role: ROLES.STAFF },
      process.env.JWT_SECRET ?? "test-access-secret",
      { expiresIn: "1h" }
    );

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.userId).toBe("user-1");
    expect(res.body.data.role).toBe(ROLES.STAFF);
    expect(querySpy).not.toHaveBeenCalled();
    querySpy.mockRestore();
  });

  it("rejects a JWT without role", async () => {
    const querySpy = jest.spyOn(pool, "query");
    const token = jwt.sign(
      { sub: "user-2" },
      process.env.JWT_SECRET ?? "test-access-secret",
      { expiresIn: "1h" }
    );

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(querySpy).not.toHaveBeenCalled();
    querySpy.mockRestore();
  });

  it("rejects requests without authorization", async () => {
    const querySpy = jest.spyOn(pool, "query");
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(querySpy).not.toHaveBeenCalled();
    querySpy.mockRestore();
  });

  it("rejects invalid tokens", async () => {
    const querySpy = jest.spyOn(pool, "query");
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer garbage");

    expect(res.status).toBe(401);
    expect(querySpy).not.toHaveBeenCalled();
    querySpy.mockRestore();
  });
});
