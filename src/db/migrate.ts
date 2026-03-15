import { runMigrations } from "./migrationRunner"

async function main() {
  try {
    await runMigrations()
    console.log("Database migrations applied")
    process.exit(0)
  } catch (err) {
    console.error("Migration failure:", err)
    process.exit(1)
  }
}

main()
