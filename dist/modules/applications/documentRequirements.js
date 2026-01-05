"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequirements = getRequirements;
exports.isSupportedProductType = isSupportedProductType;
exports.getAllowedDocumentTypes = getAllowedDocumentTypes;
exports.getDocumentCategory = getDocumentCategory;
const DEFAULT_REQUIREMENTS = {
    NEW: [
        {
            documentType: "bank_statement",
            required: true,
            multipleAllowed: true,
            category: "financial",
        },
        {
            documentType: "id_document",
            required: true,
            multipleAllowed: false,
            category: "identity",
        },
    ],
    REQUIRES_DOCS: [
        {
            documentType: "bank_statement",
            required: true,
            multipleAllowed: true,
            category: "financial",
        },
        {
            documentType: "id_document",
            required: true,
            multipleAllowed: false,
            category: "identity",
        },
    ],
    UNDER_REVIEW: [
        {
            documentType: "bank_statement",
            required: true,
            multipleAllowed: true,
            category: "financial",
        },
        {
            documentType: "id_document",
            required: true,
            multipleAllowed: false,
            category: "identity",
        },
    ],
    LENDER_SUBMITTED: [
        {
            documentType: "bank_statement",
            required: true,
            multipleAllowed: true,
            category: "financial",
        },
        {
            documentType: "id_document",
            required: true,
            multipleAllowed: false,
            category: "identity",
        },
    ],
    APPROVED: [
        {
            documentType: "bank_statement",
            required: true,
            multipleAllowed: true,
            category: "financial",
        },
        {
            documentType: "id_document",
            required: true,
            multipleAllowed: false,
            category: "identity",
        },
    ],
    DECLINED: [
        {
            documentType: "bank_statement",
            required: true,
            multipleAllowed: true,
            category: "financial",
        },
        {
            documentType: "id_document",
            required: true,
            multipleAllowed: false,
            category: "identity",
        },
    ],
    FUNDED: [
        {
            documentType: "bank_statement",
            required: true,
            multipleAllowed: true,
            category: "financial",
        },
        {
            documentType: "id_document",
            required: true,
            multipleAllowed: false,
            category: "identity",
        },
    ],
};
const REQUIREMENTS_BY_PRODUCT = {
    standard: DEFAULT_REQUIREMENTS,
};
function getRequirements(params) {
    const productRequirements = REQUIREMENTS_BY_PRODUCT[params.productType] ?? DEFAULT_REQUIREMENTS;
    return productRequirements[params.pipelineState] ?? [];
}
function isSupportedProductType(productType) {
    return Boolean(REQUIREMENTS_BY_PRODUCT[productType]);
}
function getAllowedDocumentTypes(productType) {
    const productRequirements = REQUIREMENTS_BY_PRODUCT[productType] ?? DEFAULT_REQUIREMENTS;
    const types = new Set();
    Object.values(productRequirements).forEach((requirements) => {
        requirements.forEach((requirement) => types.add(requirement.documentType));
    });
    return [...types];
}
function getDocumentCategory(productType, documentType) {
    const productRequirements = REQUIREMENTS_BY_PRODUCT[productType] ?? DEFAULT_REQUIREMENTS;
    for (const requirements of Object.values(productRequirements)) {
        const match = requirements.find((requirement) => requirement.documentType === documentType);
        if (match) {
            return match.category;
        }
    }
    return null;
}
