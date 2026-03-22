"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const packageBuilder_1 = require("../../services/lenders/packageBuilder");
const router = (0, express_1.Router)();
router.post("/send", async (req, res, next) => {
    try {
        const packageData = (0, packageBuilder_1.buildLenderPackage)(req.body);
        return res.json({
            status: "sent",
            package: packageData,
        });
    }
    catch (err) {
        return res.status(500).json({
            error: err?.message ?? "Failed to send package",
        });
    }
});
exports.default = router;
