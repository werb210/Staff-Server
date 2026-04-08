"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_ROUTES = void 0;
exports.API_ROUTES = {
    health: "/api/health",
    auth: {
        otpStart: "/api/auth/otp/start",
        otpVerify: "/api/auth/otp/verify",
    },
    application: {
        create: "/api/v1/applications",
        upload: "/api/v1/documents",
    },
};
