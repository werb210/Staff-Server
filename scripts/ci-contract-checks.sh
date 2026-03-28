#!/usr/bin/env bash
set -euo pipefail

# 1) Route existence checks in canonical server wiring
required_mounts=("/auth" "/telephony" "/crm" "/applications" "/documents")
for path in "${required_mounts[@]}"; do
  if ! rg "app\.use\(\"$path\"" src/server/createServer.ts -n >/dev/null; then
    echo "Missing required route mount: $path"
    exit 1
  fi
done

if ! rg 'app\.get\("/health"' src/server/createServer.ts -n >/dev/null; then
  echo "Missing /health route"
  exit 1
fi

# 2) Response structure checks
if ! rg 'return res\.json\(\{ success: true, otp: "123456" \}\)' src/routes/auth.routes.ts -n >/dev/null; then
  echo "Expected deterministic OTP response payload in test mode"
  exit 1
fi

# 3) Environment validation checks for deterministic tests
required_env=("NODE_ENV" "TWILIO_ACCOUNT_SID" "TWILIO_AUTH_TOKEN" "REDIS_URL")
for key in "${required_env[@]}"; do
  if ! rg "process\.env\.${key}" src/tests/env.setup.ts test/utils/testEnv.ts -n >/dev/null; then
    echo "Expected test environment configuration for ${key}"
    exit 1
  fi
done

echo "Contract checks passed"
