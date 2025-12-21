"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const requireAuth_1 = require("../middleware/requireAuth");
const drizzle_orm_1 = require("drizzle-orm");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
const stageOrder = ["prospect", "qualified", "proposal", "closed_won", "closed_lost"];
router.get("/", async (_req, res, next) => {
    try {
        const rows = await db_1.db.select().from(schema_1.deals);
        res.json(rows);
    }
    catch (err) {
        next(err);
    }
});
router.post("/:id/advance", async (req, res, next) => {
    try {
        const [deal] = await db_1.db.select().from(schema_1.deals).where((0, drizzle_orm_1.eq)(schema_1.deals.id, req.params.id)).limit(1);
        if (!deal)
            return res.status(404).json({ error: "Deal not found" });
        const currentIndex = stageOrder.indexOf(deal.stage);
        const nextIndex = Math.min(currentIndex + 1, stageOrder.length - 1);
        const [updated] = await db_1.db
            .update(schema_1.deals)
            .set({ stage: stageOrder[nextIndex], updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.deals.id, deal.id))
            .returning();
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
