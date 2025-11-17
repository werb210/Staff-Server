import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./server/src/db/schema",
  out: "./server/src/db/migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!
  }
});
