import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  TWILIO_MODE: z.string().min(1),
  DATABASE_URL: z.string().min(1).optional(),
  TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  TWILIO_API_KEY: z.string().min(1).optional(),
  TWILIO_API_SECRET: z.string().min(1).optional(),
  TWILIO_TWIML_APP_SID: z.string().min(1).optional(),
  TWILIO_PHONE_NUMBER: z.string().min(1).optional(),
  SENDGRID_API_KEY: z.string().min(1).optional(),
  WEBSITE_URL: z.string().url().optional(),
  PORTAL_URL: z.string().url().optional(),
  CLIENT_URL: z.string().url().optional(),
  FRONTEND_URL: z.string().url().optional(),
  GA_ID: z.string().min(1).optional(),
  SENTRY_DSN: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cachedEnv: ServerEnv | null = null;

export function validateServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missingOrInvalid = parsed.error.issues.map((issue) => issue.path.join("."));
    throw new Error(
      `Invalid server environment configuration: ${missingOrInvalid.join(", ")}`
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
