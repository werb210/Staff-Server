#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8080}"

AUTH_EMAIL="${AUTH_EMAIL:-smoke@example.com}"
AUTH_PASSWORD="${AUTH_PASSWORD:-smoke-password}"   # <-- REQUIRED

curl -fsS "$BASE/health" | grep -q "ok"

node <<'NODE'
const { Client } = require("pg");
const bcrypt = require("bcrypt");

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const email = process.env.AUTH_EMAIL;
  const password = process.env.AUTH_PASSWORD;
  const hash = await bcrypt.hash(password, 10);

  await client.query(`
    insert into users (email, password_hash)
    values ($1, $2)
    on conflict (email) do update
    set password_hash = excluded.password_hash
  `, [email, hash]);

  await client.end();
})();
NODE

TOKEN=$(curl -fsS \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$AUTH_EMAIL\",\"password\":\"$AUTH_PASSWORD\"}" \
  "$BASE/api/auth/login" | jq -r .token)

curl -fsS -H "Authorization: Bearer $TOKEN" "$BASE/api/users" >/dev/null
