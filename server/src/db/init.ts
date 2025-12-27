import client from "./client";

export async function initDb() {
  // no-op initializer to force client import + connection validation
  await client.query("select 1");
}

export default initDb;
