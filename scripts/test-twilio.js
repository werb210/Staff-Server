#!/usr/bin/env node

const baseUrl = (process.env.TWILIO_TEST_BASE_URL || process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

const required = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_API_KEY",
  "TWILIO_API_SECRET",
  "TWILIO_TWIML_APP_SID",
  "TWILIO_PHONE_NUMBER",
];

const missing = required.filter((name) => {
  const value = process.env[name];
  return !value || !String(value).trim();
});

if (missing.length) {
  console.log(`FAIL: missing env vars: ${missing.join(", ")}`);
  process.exitCode = 1;
  process.exit();
}

console.log(`Env vars loaded: ${required.join(", ")}`);

(async () => {
  try {
    const response = await fetch(`${baseUrl}/api/twilio/token`, { method: "GET" });
    const payload = await response.json().catch(() => ({}));
    const token = typeof payload.token === "string" ? payload.token : "";

    if (!response.ok) {
      console.log(`FAIL: /api/twilio/token returned ${response.status}`);
      process.exitCode = 1;
      return;
    }

    if (token.length <= 100) {
      console.log(`FAIL: token length was ${token.length}, expected > 100`);
      process.exitCode = 1;
      return;
    }

    console.log(`PASS: token length ${token.length} > 100`);
  } catch (error) {
    console.log(`FAIL: ${(error && error.message) || String(error)}`);
    process.exitCode = 1;
  }
})();
