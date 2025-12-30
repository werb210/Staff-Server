#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8080}"

# Defaults for CI/local. These MUST be exported so node can read process.env.*
AUTH_EMAIL="${AUTH_EMAIL:-smoke@example.com}"
AUTH_PASSWORD="${AUTH_PASSWORD:-smoke-password}"
export AUTH_EMAIL AUTH_PASSWORD

curl -fsS "$BASE/health" | grep -q "ok"

# Login should 400 on empty body (validates route is wired)
curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{}' | grep -q 400

# Ensure a known user exists in the DB for the login test
node <<'NODE'
const { Client } = require("pg");
const bcrypt = require("bcrypt");

(async () => {
  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error("DATABASE_URL missing");
  const email = process.env.AUTH_EMAIL;
  const password = process.env.AUTH_PASSWORD;

  if (!email || !password) throw new Error("AUTH_EMAIL/AUTH_PASSWORD missing");

  const client = new Client({ connectionString: cs });
  await client.connect();

  const passwordHash = await bcrypt.hash(password, 10);

  await client.query("delete from users where email=$1", [email]);
  await client.query(
    "insert into users (email, password_hash) values ($1, $2)",
    [email, passwordHash]
  );

  await client.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
NODE

# Login should now succeed and return a token
LOGIN_JSON="$(curl -fsS \
  -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$AUTH_EMAIL\",\"password\":\"$AUTH_PASSWORD\"}")"

TOKEN="$(node -e "const j=JSON.parse(process.argv[1]); if(!j.token) process.exit(1); console.log(j.token)" "$LOGIN_JSON")"

# /api/users should be protected but return 200 with token
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/users" | grep -q 200
