#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8080}"
AUTH_EMAIL="${AUTH_EMAIL:-smoke@example.com}"
AUTH_PASSWORD="${AUTH_PASSWORD:-smoke-password}"

curl -fsS "$BASE/health" | grep -q "ok"

node <<'NODE'
const { Client } = require("pg");
const bcrypt = require("bcrypt");

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const email = process.env.AUTH_EMAIL;
  const password = process.env.AUTH_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 10);

  await client.query("delete from users where email=$1", [email]);
  await client.query(
    "insert into users (email, password_hash) values ($1, $2)",
    [email, passwordHash],
  );

  await client.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE

LOGIN_RESPONSE=$(curl -sS -w "\n%{http_code}" \
  -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$AUTH_EMAIL\",\"password\":\"$AUTH_PASSWORD\"}")

LOGIN_STATUS=$(printf '%s' "$LOGIN_RESPONSE" | tail -n 1)
LOGIN_BODY=$(printf '%s' "$LOGIN_RESPONSE" | sed '$d')

if [[ "$LOGIN_STATUS" != "200" ]]; then
  echo "Login failed with status $LOGIN_STATUS"
  echo "$LOGIN_BODY"
  exit 1
fi

TOKEN=$(printf '%s' "$LOGIN_BODY" | node -e "const fs=require('fs'); const data=fs.readFileSync(0,'utf8'); const body=JSON.parse(data); if (!body.token) process.exit(1); console.log(body.token);")

curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/users" | grep -q 200
