"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
/**
 * Client application continuation endpoint.
 * Returns a placeholder response so the
 * client step flow can load in development.
 */
router.get("/continuation", async (_req, res) => {
    res.json({
        status: "ok",
        data: {},
    });
});
exports.default = router;
