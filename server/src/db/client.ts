cat > server/src/db/client.ts <<'EOF'
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Azure Postgres commonly requires SSL.
// If your DATABASE_URL includes sslmode=require, enforce SSL in pg.
const needsSsl =
  connectionString.includes("sslmode=require") ||
  process.env.PGSSLMODE === "require" ||
  process.env.DATABASE_SSL === "true";

export const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool);
EOF
