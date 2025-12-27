import client from './client';

export async function initDb() {
  if (!client._connected) {
    await client.connect();
    (client as any)._connected = true;
  }
}

export { client };
