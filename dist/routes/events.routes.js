"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
router.get("/", (_req, res) => {
    res.json([]);
});
router.get("/view-week", (_req, res) => {
    res.json([]);
});
exports.default = router;
