import { z } from "zod";

const passwordComplexity = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter")
  .regex(/[a-z]/, "Password must include at least one lowercase letter")
  .regex(/[0-9]/, "Password must include at least one number");

export const loginSchema = z.object({
  email: z.string().email(),
  password: passwordComplexity,
  portal: z.enum(["lender", "referrer", "staff"]).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10, "Refresh token is required"),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(10, "Refresh token is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
