"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const blobStorage_1 = require("../services/storage/blobStorage");
const router = (0, express_1.Router)();
router.get("/health", async (_req, res) => {
    const ok = await blobStorage_1.blobStorage.pingStorage();
    res.json({ status: ok ? "ok" : "fail" });
});
exports.default = router;
