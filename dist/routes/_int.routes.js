"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const listRoutes_1 = require("./listRoutes");
const router = (0, express_1.Router)();
router.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});
router.get("/routes", (req, res) => {
    const routes = (0, listRoutes_1.listRegisteredRoutes)(req.app, "");
    res.status(200).json({ status: "ok", routes });
});
exports.default = router;
