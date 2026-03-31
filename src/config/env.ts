import { z } from "zod";

const schema = z.object({
  PORT: z.string().default("8080"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  TWILIO_ACCOUNT_SID: z.string().min(1),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_VERIFY_SERVICE_SID: z.string().min(1),
});

export const ENV = schema.parse(process.env);
