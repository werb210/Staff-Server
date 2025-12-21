import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { lenderProducts, lenderRequiredDocuments, lenderDynamicQuestions, requiredDocMap, } from "../db/schema";
class DrizzleProductDataProvider {
    async fetchProducts() {
        return db
            .select()
            .from(lenderProducts)
            .where(eq(lenderProducts.active, true));
    }
    async fetchRequiredDocuments(productIds) {
        if (!productIds.length)
            return [];
        const docs = await db
            .select({
            id: lenderRequiredDocuments.id,
            lenderProductId: lenderRequiredDocuments.lenderProductId,
            title: lenderRequiredDocuments.title,
            description: lenderRequiredDocuments.description,
            category: lenderRequiredDocuments.category,
            isMandatory: lenderRequiredDocuments.isMandatory,
            validationRules: lenderRequiredDocuments.validationRules,
            displayOrder: lenderRequiredDocuments.displayOrder,
            createdAt: lenderRequiredDocuments.createdAt,
            updatedAt: lenderRequiredDocuments.updatedAt,
            isRequired: requiredDocMap.isRequired,
        })
            .from(requiredDocMap)
            .innerJoin(lenderRequiredDocuments, eq(requiredDocMap.requiredDocumentId, lenderRequiredDocuments.id))
            .where(inArray(requiredDocMap.lenderProductId, productIds));
        return docs;
    }
    async fetchDynamicQuestions(productIds) {
        if (!productIds.length)
            return [];
        return db.select().from(lenderDynamicQuestions).where(inArray(lenderDynamicQuestions.lenderProductId, productIds));
    }
}
export class LenderProductEngine {
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
