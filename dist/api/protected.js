"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
router.get("/admin-check", (req, res) => {
    if (req.user?.role !== "Admin") {
        return res.status(403).json({ error: "Admin access required" });
    }
    res.json({ scope: "admin" });
});
exports.default = router;
