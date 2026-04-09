import { execSync } from "child_process";

try {
  execSync("npx vitest run --reporter=verbose", { stdio: "inherit" });
} catch {
  process.exit(1);
}
