"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startVerificationSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
const otpToggle_1 = require("../services/otpToggle");
const passwordComplexity = zod_1.z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must include at least one uppercase letter")
    .regex(/[a-z]/, "Password must include at least one lowercase letter")
    .regex(/[0-9]/, "Password must include at least one number");
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: passwordComplexity,
    portal: zod_1.z.enum(["lender", "referrer", "staff"]).optional(),
    verificationCode: otpToggle_1.OTP_ENABLED
        ? zod_1.z.string().min(4, "Verification code is required")
        : zod_1.z.string().optional(),
});
exports.startVerificationSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
