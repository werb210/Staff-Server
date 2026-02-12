import rateLimit from "express-rate-limit";

const oneMinute = 60 * 1000;

function makeLimiter(max: number) {
  return rateLimit({
    windowMs: oneMinute,
    max,
    standardHeaders: true,
    legacyHeaders: false,
  });
}

export const publicLimiter = makeLimiter(60);
export const adminRateLimit = makeLimiter(120);
export const portalRateLimit = makeLimiter(120);
export const voiceRateLimit = makeLimiter(60);
export const loginRateLimit = makeLimiter(20);
export const otpRateLimit = makeLimiter(20);
export const resetOtpRateLimit = makeLimiter(20);
export const refreshRateLimit = makeLimiter(30);
export const documentUploadRateLimit = makeLimiter(30);
export const clientSubmissionRateLimit = makeLimiter(40);
export const lenderSubmissionRateLimit = makeLimiter(40);
export const clientReadRateLimit = makeLimiter(120);
export const clientDocumentsRateLimit = makeLimiter(40);
export const pushSendRateLimit = makeLimiter(30);
export const otpSendLimiter = makeLimiter(20);
export const otpVerifyLimiter = makeLimiter(20);
