import jwt from "jsonwebtoken";
import request from "supertest";
import { buildAppWithApiRoutes } from "../app";
import { ROLES } from "../auth/roles";

const app = buildAppWithApiRoutes();

describe("auth me smoke", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "test-access-secret";
  });

  it("accepts a signed token with sub and returns user info", async () => {
    const token = jwt.sign(
      {
        sub: "user-123",
        role: ROLES.STAFF,
        phone: "+14155551234",
      },
      process.env.JWT_SECRET ?? "test-access-secret",
      { expiresIn: "1h" }
    );

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe("user-123");
    expect(res.body.role).toBe(ROLES.STAFF);
  });

  it("returns null role when token has no role claim", async () => {
    const token = jwt.sign(
      {
        sub: "test-user-123",
      },
      process.env.JWT_SECRET ?? "test-access-secret",
      { expiresIn: "1h" }
    );

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe("test-user-123");
    expect(res.body.role).toBeNull();
  });
});
