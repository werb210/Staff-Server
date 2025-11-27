import { ZodSchema, z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const resetSchema = z.object({
  email: z.string().email(),
  token: z.string().optional(),
  password: z.string().min(8).optional(),
});

export const otpSchema = z.object({
  userId: z.string().uuid(),
  code: z.string().length(6),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  phone: z.string().min(7).max(20).optional(),
  timezone: z.string().optional(),
});

export const paginationSchema = z.object({
  take: z.coerce.number().min(1).max(100).default(20),
  skip: z.coerce.number().min(0).default(0),
});

export function validateBody<T>(schema: ZodSchema<T>, payload: unknown): T {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => issue.message).join('; ');
    const error = new Error(messages);
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  return parsed.data;
}

export function validateQuery<T>(schema: ZodSchema<T>, payload: unknown): T {
  return validateBody(schema, payload);
}
