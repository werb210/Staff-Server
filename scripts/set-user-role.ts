import { pool } from "../src/db";
import { isRole, type Role } from "../src/auth/roles";
import { parsePhoneNumberFromString } from "libphonenumber-js";

type UserRow = {
  id: string;
  email: string | null;
  phoneNumber: string;
  role: string | null;
};

function normalizeEmail(email: string | undefined): string | null {
  if (!email) {
    return null;
  }
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePhone(phone: string | undefined): string | null {
  if (!phone) {
    return null;
  }
  const parsed = parsePhoneNumberFromString(phone);
  const normalized = parsed?.format("E.164") ?? phone.trim();
  return normalized.length > 0 ? normalized : null;
}

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const email = normalizeEmail(getArgValue(args, "--email"));
  const phone = normalizePhone(getArgValue(args, "--phone"));
  const roleInput = getArgValue(args, "--role");

  if (!email && !phone) {
    throw new Error("Provide --email or --phone to locate the user.");
  }
  if (!roleInput) {
    throw new Error("Provide --role to set the user role.");
  }

  const normalizedRole = roleInput.trim().toLowerCase();
  if (!isRole(normalizedRole)) {
    throw new Error(`Role must be one of the allowed roles.`);
  }
  const role = normalizedRole as Role;

  const client = await pool.connect();
  try {
    const params: Array<string> = [];
    let query = `select id, email, phone_number as "phoneNumber", role from users`;
    if (email && phone) {
      params.push(email, phone);
      query += ` where email = $1 and phone_number = $2`;
    } else if (email) {
      params.push(email);
      query += ` where email = $1`;
    } else if (phone) {
      params.push(phone);
      query += ` where phone_number = $1`;
    }
    query += ` limit 1`;

    const result = await client.query<UserRow>(query, params);
    const user = result.rows[0];
    if (!user) {
      console.error("User not found.");
      process.exitCode = 1;
      return;
    }

    await client.query("begin");
    await client.query(`update users set role = $1 where id = $2`, [
      role,
      user.id,
    ]);
    await client.query("commit");

    console.log("User role updated.", {
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      previousRole: user.role,
      newRole: role,
    });
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

async function run(): Promise<void> {
  try {
    await main();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    console.error(message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void run();
