"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jwt_service_1 = require("../services/jwt.service");
const router = (0, express_1.Router)();
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    // TEMP: replace with DB lookup
    if (email !== "todd.w@boreal.financial" || password !== "1Sucker1!") {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = (0, jwt_service_1.signJwt)({ email });
    return res.json({ token });
});
exports.default = router;
