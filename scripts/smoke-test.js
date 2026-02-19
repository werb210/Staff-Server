const fetch = require("node-fetch");

async function test() {
  try {
    const health = await fetch("http://localhost:8080/health");
    if (!health.ok) throw new Error("Health check failed");

    const build = await fetch("http://localhost:8080/build-info");
    if (!build.ok) throw new Error("Build info failed");

    console.log("✅ Smoke test passed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Smoke test failed:", err.message);
    process.exit(1);
  }
}

test();
