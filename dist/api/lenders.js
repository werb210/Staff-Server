"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const requireAuth_1 = require("../middleware/requireAuth");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
router.post("/required-documents", async (req, res, next) => {
    try {
        const parsed = req.body ?? {};
        if (!parsed.lenderProductId || !parsed.docCategory) {
            throw new Error("lenderProductId and docCategory are required");
        }
        const [created] = await db_1.db
            .insert(schema_1.lenderRequiredDocuments)
            .values({
            lenderProductId: parsed.lenderProductId,
            docCategory: parsed.docCategory,
            title: parsed.title,
            description: parsed.description ?? null,
            category: parsed.category ?? null,
            isMandatory: parsed.isMandatory ?? false,
            validationRules: parsed.validationRules ?? {},
            displayOrder: parsed.displayOrder ?? 0,
        })
            .returning();
        res.json(created);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
