"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const requireAuth_1 = require("../middleware/requireAuth");
const drizzle_orm_1 = require("drizzle-orm");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
router.get("/", async (_req, res, next) => {
    try {
        const products = await db_1.db.select().from(schema_1.lenderProducts);
        res.json(products);
    }
    catch (err) {
        next(err);
    }
});
router.get("/:id/requirements", async (req, res, next) => {
    try {
        const [product] = await db_1.db.select().from(schema_1.lenderProducts).where((0, drizzle_orm_1.eq)(schema_1.lenderProducts.id, req.params.id)).limit(1);
        if (!product)
            return res.status(404).json({ error: "Product not found" });
        const docs = await db_1.db.select().from(schema_1.productRequiredDocs).where((0, drizzle_orm_1.eq)(schema_1.productRequiredDocs.lenderProductId, product.id));
        const questions = await db_1.db.select().from(schema_1.productQuestions).where((0, drizzle_orm_1.eq)(schema_1.productQuestions.lenderProductId, product.id));
        res.json({ product, requiredDocuments: docs, questions });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
