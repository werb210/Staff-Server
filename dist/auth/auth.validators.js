import { z } from "zod";
import { OTP_ENABLED } from "../services/otpToggle";
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
    verificationCode: OTP_ENABLED
        ? z.string().min(4, "Verification code is required")
        : z.string().optional(),
});
export const startVerificationSchema = z.object({
    email: z.string().email(),
});
