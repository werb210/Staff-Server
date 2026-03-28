type RedisLike = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, mode?: string, ttl?: number) => Promise<string>;
  del: (key: string) => Promise<number>;
};

let client: RedisLike | null = null;

const memoryStore = new Map<string, string>();
const inMemoryStore = createInMemoryRedis();

function createInMemoryRedis(): RedisLike {
  return {
    get: async (key: string) => memoryStore.get(key) ?? null,
    set: async (key: string, value: string) => {
      memoryStore.set(key, value);
      return "OK";
    },
    del: async (key: string) => {
      const existed = memoryStore.delete(key);
      return existed ? 1 : 0;
    },
  };
}

export function getRedis(): RedisLike {
  if (process.env.NODE_ENV === "test") {
    return inMemoryStore;
  }

  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL required outside test");
  }

  if (!client) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require("ioredis");
    client = new Redis(process.env.REDIS_URL) as RedisLike;
  }

  return client;
}

export const redis = getRedis();

export function resetRedisMock(): void {
  memoryStore.clear();
  if (process.env.NODE_ENV === "test") {
    client = null;
  }
}

export async function setOtp(phone: string, code: string) {
  await getRedis().set(`otp:${phone}`, code, "EX", 300);
}

export async function fetchOtp(phone: string) {
  return getRedis().get(`otp:${phone}`);
}

export async function deleteOtp(phone: string) {
  await getRedis().del(`otp:${phone}`);
}
