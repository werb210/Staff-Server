import { client } from "./client";

export async function initDb() {
  await client.connect();
}
