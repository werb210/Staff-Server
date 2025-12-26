import { Pool } from "pg";
const connectionString = process.env.DATABASE_URL;
export const pool = new Pool(connectionString
    ? { connectionString }
    : {
        host: process.env.PGHOST ?? "localhost",
        port: Number(process.env.PGPORT ?? 5432),
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
    });
