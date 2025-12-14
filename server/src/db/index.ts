import { Client } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL missing");
}

export const db = new Client({
  connectionString: process.env.DATABASE_URL,
});

db.connect()
  .then(() => console.log("DB connected"))
  .catch((err) => {
    console.error("DB connection failed", err);
    process.exit(1);
  });
