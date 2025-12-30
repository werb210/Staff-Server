#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8080}"

AUTH_EMAIL="${AUTH_EMAIL:-smoke@example.com}"
AUTH_PASSWORD="${AUTH_PASSWORD:-smoke-password}"

# CRITICAL: export so the Node heredoc can read them
export AUTH_EMAIL
export AUTH_PASSWORD

if [[ -z "${AUTH_PASSWORD}" ]]; then
  echo "AUTH_PASSWORD is empty"
  exit 1
fi

# Health must always pass
curl -fsS "$BASE/health" | grep -q "ok"

# Ensure user exists in DB (table is bootstrapped by assertDb(), but we upsert anyway)
node <<'NODE'
const { Client } = require("pg");
const bcrypt = require("bcrypt");

(async () => {
  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error("missing DATABASE_URL");

  const email = process.env.AUTH_EMAIL;
  const password = process.env.AUTH_PASSWORD;

  if (!email) throw new Error("missing AUTH_EMAIL");
  if (!password) throw new Error("missing AUTH_PASSWORD");

  const client = new Client({ connectionString: cs });
  await client.connect();

  const hash = await bcrypt.hash(String(password), 10);

  await client.query(
    `
      insert into users (email, password_hash)
      values ($1, $2)
      on conflict (email) do update
        set password_hash = excluded.password_hash,
            updated_at = now()
    `,
    [email, hash]
  );

  await client.end();
})();
NODE

# Login and verify token works
LOGIN_JSON=$(curl -sS -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$AUTH_EMAIL\",\"password\":\"$AUTH_PASSWORD\"}")

echo "$LOGIN_JSON" | grep -q "\"token\""

TOKEN=$(node -e "const r=$LOGIN_JSON; console.log(JSON.parse(r).token || '')")
if [[ -z "$TOKEN" ]]; then
  echo "No token returned from /api/auth/login"
  exit 1
fi

# Protected route should return 200
curl -sS -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/users" | grep -q 200
