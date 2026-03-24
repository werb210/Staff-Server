import { existsSync } from "node:fs";

if (existsSync("src/routes")) {
  console.error("❌ routes directory is forbidden");
  process.exit(1);
}

console.log("Architecture guardrails passed.");
