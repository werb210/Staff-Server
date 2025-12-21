"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.me = void 0;
const auth_validators_1 = require("./auth.validators");
const errors_1 = require("../errors");
const authService_1 = require("../services/authService");
const jwt_1 = require("../utils/jwt");
const me = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthenticated" });
    }
    return res.status(200).json(req.user);
};
exports.me = me;
exports.authController = {
    async login(req, res, next) {
        try {
            const parsed = auth_validators_1.loginSchema.parse(req.body);
            const user = await (0, authService_1.verifyUserCredentials)(parsed.email.trim().toLowerCase(), parsed.password);
            if (!user) {
                return res.status(401).json({ error: "Invalid credentials" });
            }
            const { token } = (0, jwt_1.generateAccessToken)(user);
            return res.status(200).json({ token });
        }
        catch (err) {
            next(err instanceof errors_1.BadRequest ? err : new errors_1.BadRequest("Login failed"));
        }
    },
};
