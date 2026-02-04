import { randomUUID } from "crypto";
import { pool } from "../../db";
import type { Role } from "../../auth/roles";

export async function seedUser(params: {
  phoneNumber: string;
  email: string;
  role: Role;
  lenderId?: string | null;
}): Promise<{ id: string }> {
  const userId = randomUUID();
  await pool.query(
    `insert into users
     (id, email, phone_number, phone, role, lender_id, status, active, is_active, disabled, phone_verified, token_version)
     values ($1, $2, $3, $4, $5, $6, 'ACTIVE', true, true, false, true, 0)`,
    [
      userId,
      params.email,
      params.phoneNumber,
      params.phoneNumber,
      params.role,
      params.lenderId ?? null,
    ]
  );
  return { id: userId };
}
