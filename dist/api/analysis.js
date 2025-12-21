"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../db");
const requireAuth_1 = require("../middleware/requireAuth");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
router.get("/applications", async (_req, res, next) => {
    try {
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      select status, count(*)::text as count
      from applications
      group by status
    `);
        const counts = {};
        for (const row of result.rows) {
            counts[row.status] = Number(row.count);
        }
        res.json(counts);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
