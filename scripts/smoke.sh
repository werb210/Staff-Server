#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8080}"

AUTH_EMAIL="${AUTH_EMAIL:-smoke@example.com}"
AUTH_PASSWORD="${AUTH_PASSWORD:-smoke-password}"
DATABASE_URL="${DATABASE_URL:-}"

export AUTH_EMAIL
export AUTH_PASSWORD
export DATABASE_URL

[[ -z "$DATABASE_URL" ]] && { echo "DATABASE_URL is empty"; exit 1; }
[[ -z "$AUTH_EMAIL" ]] && { echo "AUTH_EMAIL is empty"; exit 1; }
[[ -z "$AUTH_PASSWORD" ]] && { echo "AUTH_PASSWORD is empty"; exit 1; }

# Health check
curl -fsS "$BASE/health" | grep -q "ok"

# Ensure user exists
node <<'NODE'
const { Client } = require("pg");
const bcrypt = require("bcrypt");

(async () => {
  const { DATABASE_URL, AUTH_EMAIL, AUTH_PASSWORD } = process.env;
  if (!DATABASE_URL || !AUTH_EMAIL || !AUTH_PASSWORD) {
    throw new Error("Missing env");
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const hash = await bcrypt.hash(String(AUTH_PASSWORD), 10);

  await client.query(`
    create extension if not exists "pgcrypto";
    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      email text unique not null,
      password_hash text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  await client.query(
    `
      insert into users (email, password_hash, updated_at)
      values ($1, $2, now())
      on conflict (email) do update
        set password_hash = excluded.password_hash,
            updated_at = now()
    `,
    [AUTH_EMAIL, hash]
  );

  await client.end();
})();
NODE

# Login
LOGIN_JSON="$(curl -sS -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$AUTH_EMAIL\",\"password\":\"$AUTH_PASSWORD\"}")"

echo "$LOGIN_JSON" | grep -q '"token"'

# Extract token SAFELY
TOKEN="$(echo "$LOGIN_JSON" | node -e '
let d="";
process.stdin.on("data", c => d+=c);
process.stdin.on("end", () => {
  const j = JSON.parse(d);
  console.log(j.token || "");
});
')"

[[ -z "$TOKEN" ]] && { echo "No token returned"; exit 1; }

# Authenticated route
curl -sS -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/users" | grep -q 200
