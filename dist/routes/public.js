"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const router = (0, express_1.Router)();
/**
 * GET /api/applications
 * Supports filtering by stage via query param
 * Example: /api/applications?stage=new
 */
router.get("/api/applications", async (req, res) => {
    try {
        const stage = req.query.stage;
        let results;
        const isValidStage = typeof stage === "string" &&
            schema_1.applicationStatusEnum.enumValues.includes(stage);
        if (isValidStage) {
            const typedStage = stage;
            results = await db_1.db
                .select()
                .from(schema_1.applications)
                .where((0, drizzle_orm_1.eq)(schema_1.applications.status, typedStage));
        }
        else {
            results = await db_1.db.select().from(schema_1.applications);
        }
        res.json(results);
    }
    catch (err) {
        console.error("Failed to fetch applications", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = router;
