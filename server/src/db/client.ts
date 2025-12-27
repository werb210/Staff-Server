import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'false'
    ? false
    : { rejectUnauthorized: false },
});

export default client;
