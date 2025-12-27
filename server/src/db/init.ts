// server/src/db/init.ts

import client from './client.js';

export async function initDb() {
  const c: any = client as any;

  if (!c.__connected) {
    await client.connect();
    c.__connected = true;
  }
}

export { client };
export default client;
