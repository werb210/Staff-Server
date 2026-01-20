import request from "supertest";
import { randomUUID } from "crypto";
import { app } from "../src";
import { pool } from "../src/db";
import { ROLES, type Role } from "../src/auth/roles";

async function upsertUser(params: { phone: string; role: Role }) {
  const userId = randomUUID();
  await pool.query(
    `insert into users (
        id,
        email,
        phone_number,
        phone,
        role,
        active,
        is_active,
        disabled,
        locked_until,
        phone_verified
      )
     values ($1, $2, $3, $4, $5, true, true, false, null, true)
     on conflict (phone_number) do update
       set email = excluded.email,
           phone = excluded.phone,
           role = excluded.role,
           active = excluded.active,
           is_active = excluded.is_active,
           disabled = excluded.disabled,
           locked_until = excluded.locked_until,
           phone_verified = excluded.phone_verified`,
    [userId, `auth-${userId}@example.com`, params.phone, params.phone, params.role]
  );
  return { userId };
}

async function issueToken(phone: string): Promise<string> {
  const res = await request(app)
    .post("/api/auth/otp/verify")
    .send({ phone, code: "123456" });
  const token = res.body.accessToken;
  expect(token).toBeTruthy();
  return token;
}

describe("auth middleware smoke test", () => {
  it("allows Staff/Admin and blocks unauthorized roles", async () => {
    const adminPhone = "+15555550001";
    const lenderPhone = "+15555550002";

    await upsertUser({ phone: adminPhone, role: ROLES.ADMIN });
    await upsertUser({ phone: lenderPhone, role: ROLES.LENDER });

    const adminToken = await issueToken(adminPhone);
    const lenderToken = await issueToken(lenderPhone);

    const adminRes = await request(app)
      .get("/api/lenders")
      .set("Authorization", `Bearer ${adminToken}`);

    const lenderRes = await request(app)
      .get("/api/lenders")
      .set("Authorization", `Bearer ${lenderToken}`);

    expect(adminRes.status).toBe(200);
    expect(lenderRes.status).toBe(403);
  });
});
