"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LenderProductEngine = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
class DrizzleProductDataProvider {
    async fetchProducts() {
        return db_1.db
            .select()
            .from(schema_1.lenderProducts)
            .where((0, drizzle_orm_1.eq)(schema_1.lenderProducts.active, true));
    }
    async fetchRequiredDocuments(productIds) {
        if (!productIds.length)
            return [];
        const docs = await db_1.db
            .select({
            id: schema_1.lenderRequiredDocuments.id,
            lenderProductId: schema_1.lenderRequiredDocuments.lenderProductId,
            title: schema_1.lenderRequiredDocuments.title,
            description: schema_1.lenderRequiredDocuments.description,
            category: schema_1.lenderRequiredDocuments.category,
            isMandatory: schema_1.lenderRequiredDocuments.isMandatory,
            validationRules: schema_1.lenderRequiredDocuments.validationRules,
            displayOrder: schema_1.lenderRequiredDocuments.displayOrder,
            createdAt: schema_1.lenderRequiredDocuments.createdAt,
            updatedAt: schema_1.lenderRequiredDocuments.updatedAt,
            isRequired: schema_1.requiredDocMap.isRequired,
        })
            .from(schema_1.requiredDocMap)
            .innerJoin(schema_1.lenderRequiredDocuments, (0, drizzle_orm_1.eq)(schema_1.requiredDocMap.requiredDocumentId, schema_1.lenderRequiredDocuments.id))
            .where((0, drizzle_orm_1.inArray)(schema_1.requiredDocMap.lenderProductId, productIds));
        return docs;
    }
    async fetchDynamicQuestions(productIds) {
        if (!productIds.length)
            return [];
        return db_1.db.select().from(schema_1.lenderDynamicQuestions).where((0, drizzle_orm_1.inArray)(schema_1.lenderDynamicQuestions.lenderProductId, productIds));
    }
}
class LenderProductEngine {
    provider;
    constructor(provider = new DrizzleProductDataProvider()) {
        this.provider = provider;
    }
    async evaluate(input) {
        const products = await this.provider.fetchProducts();
        const matchedProducts = this.filterProducts(products, input);
        const productIds = matchedProducts.map((p) => p.id);
        const [docs, questions] = await Promise.all([
            this.provider.fetchRequiredDocuments(productIds),
            this.provider.fetchDynamicQuestions(productIds),
        ]);
        return {
            recommendedCategories: this.recommendCategories(matchedProducts, input),
            dynamicQuestions: this.mergeQuestions(questions),
            requiredDocuments: this.mergeDocuments(docs),
            matchedProducts,
        };
    }
    filterProducts(products, input) {
        return products.filter((product) => {
            const amountOk = !input.requestedAmount || !product.maxAmount || Number(product.maxAmount) >= input.requestedAmount;
            const minOk = !input.requestedAmount || !product.minAmount || Number(product.minAmount) <= input.requestedAmount;
            const categoryOk = !input.chosenCategory || product.productType === input.chosenCategory;
            return amountOk && minOk && categoryOk;
        });
    }
    recommendCategories(products, input) {
        if (input.chosenCategory)
            return [input.chosenCategory];
        const categories = new Set(products.map((p) => p.productCategory ?? p.productType));
        return Array.from(categories);
    }
    mergeQuestions(records) {
        const map = new Map();
        records
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .forEach((q) => {
            if (!map.has(q.label)) {
                map.set(q.label, q);
            }
        });
        return Array.from(map.values()).map((q) => ({
            label: q.label,
            type: q.type,
            required: q.required,
            options: Array.isArray(q.options) ? q.options : [],
            lenderProductId: q.lenderProductId,
        }));
    }
    mergeDocuments(records) {
        const map = new Map();
        records.forEach((doc) => {
            if (!map.has(doc.docCategory)) {
                map.set(doc.docCategory, doc);
            }
        });
        return Array.from(map.values()).map((doc) => ({
            docCategory: doc.docCategory,
            required: doc.required && (doc.isRequired ?? true),
            lenderProductId: doc.lenderProductId,
        }));
    }
}
exports.LenderProductEngine = LenderProductEngine;
