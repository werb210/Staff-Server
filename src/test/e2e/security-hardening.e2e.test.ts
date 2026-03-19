import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ROLES } from "../../auth/roles";
import { createTestServer } from "../../server/testServer";
import { seedUser } from "../helpers/users";

let server: Awaited<ReturnType<typeof createTestServer>>;
let phoneCounter = 7000;

const nextPhone = (): string =>
  `+1415555${String(phoneCounter++).padStart(4, "0")}`;

describe("production-safe auth/session hardening", () => {
  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it("returns credential-friendly CORS headers for trusted portal origins", async () => {
    const res = await request(server.url)
      .options("/api/auth/otp/start")
      .set("Origin", "https://staff.boreal.financial")
      .set("Access-Control-Request-Method", "POST");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("https://staff.boreal.financial");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("enforces CSRF token when browser cookies are present", async () => {
    const phone = nextPhone();
    await seedUser({
      phoneNumber: phone,
      role: ROLES.STAFF,
      email: `csrf-${phone.replace(/\D/g, "")}@example.com`,
    });

    const agent = request.agent(server.url);
    await agent.post("/api/auth/otp/start").send({ phone }).expect(200);
    await agent.post("/api/auth/otp/verify").send({ phone, code: "123456" }).expect(200);

    const logoutWithoutCsrf = await agent
      .post("/api/auth/logout")
      .set("Origin", "http://localhost:3000")
      .send({});

    expect(logoutWithoutCsrf.status).toBe(403);
    expect(logoutWithoutCsrf.body.error?.code).toBe("csrf_token_required");
  });
});
