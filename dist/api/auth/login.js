"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
const authService_1 = require("../../services/authService");
const jwt_1 = require("../../utils/jwt");
async function login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Missing credentials" });
    }
    const user = await (0, authService_1.verifyUserCredentials)(email, password);
    if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    const { token: accessToken } = (0, jwt_1.generateAccessToken)(user);
    return res.status(200).json({
        accessToken,
        user,
    });
}
