import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";

function buildPublicLimiter(max = 10): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
    message: { success: false, error: "rate_limited", code: 429 },
  });
}

export const publicLimiter = buildPublicLimiter();
export const contactRateLimiter = buildPublicLimiter();
export const readinessRateLimiter = buildPublicLimiter();
export const chatPublicRateLimiter = buildPublicLimiter();
export const otpPublicRateLimiter = buildPublicLimiter();
