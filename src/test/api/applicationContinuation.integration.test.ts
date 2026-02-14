import { randomUUID } from "crypto";
import type { Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { pool } from "../../db";
import { ROLES } from "../../auth/roles";
import { createTestApp } from "../helpers/testApp";
import { seedUser } from "../helpers/users";

let app: Express;
let phoneCounter = 7000;

const nextPhone = (): string => `+1415888${String(phoneCounter++).padStart(4, "0")}`;

async function login(): Promise<{ token: string; userId: string }> {
  const phone = nextPhone();
  await seedUser({
    phoneNumber: phone,
    role: ROLES.STAFF,
    email: `cont-${phone.replace(/\D/g, "")}@example.com`,
  });

  const res = await request(app).post("/api/auth/login").send({ phone, code: "123456" });
  return { token: res.body.accessToken, userId: res.body.user.id };
}

describe("application continuation integration", () => {
  beforeAll(async () => {
    app = await createTestApp();
  });

  it("returns latest incomplete application for authenticated user", async () => {
    const { token, userId } = await login();
    const oldId = randomUUID();
    const latestId = randomUUID();

    await pool.query(
      `insert into applications
        (id, owner_user_id, name, metadata, product_type, pipeline_state, status, source, current_step, last_updated, is_completed, created_at, updated_at)
       values
        ($1, $2, 'Older', '{"foo":"bar"}'::jsonb, 'standard', 'RECEIVED', 'RECEIVED', 'test', 2, now() - interval '1 day', false, now(), now()),
        ($3, $2, 'Latest', '{"hello":"world"}'::jsonb, 'standard', 'IN_REVIEW', 'IN_REVIEW', 'test', 3, now(), false, now(), now())`,
      [oldId, userId, latestId]
    );

    const res = await request(app)
      .get("/api/application/continuation")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      exists: true,
      applicationId: latestId,
      step: 3,
      data: { hello: "world" },
    });
  });

  it("returns exists false when there is no incomplete application", async () => {
    const { token } = await login();

    const res = await request(app)
      .get("/api/application/continuation")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ exists: false });
  });

  it("returns 401 for invalid token", async () => {
    const res = await request(app)
      .get("/api/application/continuation")
      .set("Authorization", "Bearer not-a-token");

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ ok: false, error: "invalid_token" });
  });
});
