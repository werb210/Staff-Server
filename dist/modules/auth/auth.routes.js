"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const otpStore_1 = require("./otpStore");
const env_1 = require("../../config/env");
const router = (0, express_1.Router)();
router.post('/api/auth/otp/start', (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ ok: false });
    }
    const code = (0, otpStore_1.createOtp)(phone);
    return res.status(200).json({
        ok: true,
        data: {
            sent: true,
            otp: env_1.isTest ? code : undefined
        }
    });
});
router.post('/api/auth/otp/verify', (req, res) => {
    const { phone, code } = req.body;
    const valid = (0, otpStore_1.verifyOtp)(phone, code);
    if (!valid) {
        return res.status(400).json({ ok: false });
    }
    return res.status(200).json({
        ok: true,
        token: 'test-token'
    });
});
router.get('/api/auth/me', (_req, res) => {
    return res.status(200).json({
        ok: true,
        user: { id: 'test-user' }
    });
});
router.post('/api/auth/logout', (_req, res) => {
    return res.status(204).send();
});
exports.default = router;
