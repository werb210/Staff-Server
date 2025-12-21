"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const zod_1 = require("zod");
const auth_validators_1 = require("./auth.validators");
const errors_1 = require("../errors");
const authService_1 = require("../services/authService");
const jwt_1 = require("../utils/jwt");
exports.authController = {
    async login(req, res, next) {
        try {
            const parsed = auth_validators_1.loginSchema.parse(req.body);
            const normalized = {
                ...parsed,
                email: parsed.email.trim().toLowerCase(),
                password: parsed.password,
            };
            if (!normalized.password) {
                throw new errors_1.BadRequest("password required");
            }
            const user = await (0, authService_1.verifyUserCredentials)(normalized.email, normalized.password);
            if (!user) {
                return res.status(401).json({ error: "Invalid credentials" });
            }
            const { token: accessToken } = (0, jwt_1.generateAccessToken)(user);
            res.status(200).json({
                user,
                accessToken,
            });
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                return res
                    .status(400)
                    .json({ error: error.errors.map((e) => e.message).join(", ") });
            }
            next(error);
        }
    },
    async me(req, res) {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }
        return res.json({ user: req.user });
    },
};
