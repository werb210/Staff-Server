"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get("/build", (_req, res) => {
    res.status(200).json({
        status: "ok",
        node: process.version,
        env: process.env.NODE_ENV ?? "unknown",
    });
});
exports.default = router;
