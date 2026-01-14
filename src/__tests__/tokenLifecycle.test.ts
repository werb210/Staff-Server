import jwt from "jsonwebtoken";
import request from "supertest";
import { buildAppWithApiRoutes } from "../app";
import { ROLES } from "../auth/roles";

describe("token lifecycle stability", () => {
  let app: ReturnType<typeof buildAppWithApiRoutes>;

  beforeAll(() => {
    process.env.JWT_SECRET = "test-access-secret";
    app = buildAppWithApiRoutes();
  });

  it("allows a grace window for /api/auth/me on expired tokens", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      {
        sub: "grace-user",
        role: ROLES.STAFF,
        exp: nowSeconds - 30,
        iat: nowSeconds - 60,
      },
      process.env.JWT_SECRET ?? "test-access-secret",
      { noTimestamp: true }
    );

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.userId).toBe("grace-user");
  });

  it("rejects expired tokens outside the grace window", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      {
        sub: "expired-user",
        role: ROLES.STAFF,
        exp: nowSeconds - 600,
        iat: nowSeconds - 660,
      },
      process.env.JWT_SECRET ?? "test-access-secret",
      { noTimestamp: true }
    );

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
  });
});
