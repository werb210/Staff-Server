import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().optional(),
  CORS_ORIGIN: z.string(),
  AZURE_STORAGE_ACCOUNT: z.string(),
  AZURE_STORAGE_ACCESS_KEY: z.string(),
  AZURE_STORAGE_CONTAINER: z.string(),
});

export type Env = {
  PORT?: number;
  CORS_ORIGIN: string;
  AZURE_STORAGE_ACCOUNT: string;
  AZURE_STORAGE_ACCESS_KEY: string;
  AZURE_STORAGE_CONTAINER: string;
};

let cachedEnv: Env | null = null;

export const loadEnv = (): Env => {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Missing or invalid environment variables: ${missing}`);
  }

  const env = {
    ...parsed.data,
    PORT: parsed.data.PORT ? Number(parsed.data.PORT) : undefined,
  } satisfies Env;

  cachedEnv = env;
  return env;
};
