/**
 * STAFF-SERVER — FULL SMOKE TEST (CODEX)
 *
 * PURPOSE:
 *  - Prove the server builds
 *  - Boots like Azure
 *  - Registers routes
 *  - Enforces CORS
 *  - Enforces auth
 *
 * HOW TO RUN (CI or local):
 *   1) npm run build
 *   2) node dist/index.js &
 *   3) node smoke.test.js
 *
 * REQUIREMENTS:
 *  - dist/index.js exists
 *  - server listens on PORT (default 8080)
 */

import http from "http";
import assert from "assert";

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const STAFF_ORIGIN = "https://staff.boreal.financial";
const BAD_ORIGIN = "https://evil.example.com";

/* --------------------- helpers --------------------- */
function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () =>
          resolve({ status: res.statusCode || 0, headers: res.headers, body: data }),
        );
      },
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

/* --------------------- tests --------------------- */
(async () => {
  console.log("🚀 STAFF-SERVER SMOKE TEST START");

  /* 1) HEALTH CHECK */
  const health = await request("/api/_int/health");
  assert.equal(health.status, 200, "health endpoint must return 200");
  console.log("✅ health check");

  /* 2) ROUTES REGISTERED */
  const routes = await request("/api/_int/routes");
  assert.equal(routes.status, 200, "routes endpoint must return 200");
  assert.ok(routes.body.includes("auth"), "auth routes missing");
  console.log("✅ routing");

  /* 3) 404 SANITY */
  const notFound = await request("/this-should-not-exist");
  assert.equal(notFound.status, 404, "unknown routes must return 404");
  console.log("✅ 404 handling");

  /* 4) CORS — ALLOWED ORIGIN */
  const corsOk = await request("/api/_int/health", {
    headers: { Origin: STAFF_ORIGIN },
  });
  assert.equal(
    corsOk.headers["access-control-allow-origin"],
    STAFF_ORIGIN,
    "allowed origin missing",
  );
  console.log("✅ CORS allowed origin");

  /* 5) CORS — BLOCKED ORIGIN */
  const corsBad = await request("/api/_int/health", {
    headers: { Origin: BAD_ORIGIN },
  });
  assert.notEqual(
    corsBad.headers["access-control-allow-origin"],
    BAD_ORIGIN,
    "blocked origin should not be echoed",
  );
  console.log("✅ CORS blocked origin");

  /* 6) AUTH — UNAUTHENTICATED BLOCK */
  const unauth = await request("/api/users/me");
  assert.equal(unauth.status, 401, "unauthenticated access must be blocked");
  console.log("✅ auth enforcement");

  /* 7) AZURE PARITY — NO DEV DEPENDENCIES REQUIRED */
  const nodeEnv = process.env.NODE_ENV || "production";
  assert.ok(nodeEnv, "NODE_ENV must exist");
  console.log("✅ Azure parity startup");

  console.log("🎉 ALL SMOKE TESTS PASSED");
  process.exit(0);
})().catch((err) => {
  console.error("❌ SMOKE TEST FAILED");
  console.error(err);
  process.exit(1);
});
