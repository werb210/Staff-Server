const semver = require("semver");

const required = ">=20.10.0 <21.0.0";
const current = process.version;

if (!semver.satisfies(current, required)) {
  console.error(`❌ Node version mismatch. Required ${required}, got ${current}`);
  process.exit(1);
}

console.log(`✅ Node version OK: ${current}`);
