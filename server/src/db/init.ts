import client from './client';

export async function initDb() {
  // no-op for now; client initializes the pool on import
  return client;
}

export default initDb;
