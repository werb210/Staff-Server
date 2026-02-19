const { execSync } = require("child_process")

try {
  execSync("npm run build", { stdio: "inherit" })
  console.log("✅ Server build smoke test passed")
} catch (err) {
  console.error("❌ Server build failed")
  process.exit(1)
}
