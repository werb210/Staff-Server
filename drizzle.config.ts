import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./server/src/db/schema",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
});
