"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MERCHANT_GROWTH_SHEET_MAP = exports.MERCHANT_GROWTH_LENDER_NAME = void 0;
exports.MERCHANT_GROWTH_LENDER_NAME = "Merchant Growth";
function getMetadata(payload) {
    if (payload.application.metadata && typeof payload.application.metadata === "object") {
        return payload.application.metadata;
    }
    return {};
}
function getApplicant(payload) {
    const metadata = getMetadata(payload);
    const applicant = metadata.applicant;
    return applicant && typeof applicant === "object" ? applicant : {};
}
function getBusiness(payload) {
    const metadata = getMetadata(payload);
    const business = metadata.business;
    return business && typeof business === "object" ? business : {};
}
function getBusinessAddress(payload) {
    const business = getBusiness(payload);
    const address = business.address;
    return address && typeof address === "object" ? address : {};
}
function getFinancials(payload) {
    const metadata = getMetadata(payload);
    const financials = metadata.financials ?? metadata.revenue ?? metadata.banking;
    return financials && typeof financials === "object"
        ? financials
        : {};
}
function asString(value) {
    if (typeof value === "string") {
        return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }
    return "";
}
function asNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    const parsed = typeof value === "string" ? Number(value) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
}
exports.MERCHANT_GROWTH_SHEET_MAP = {
    applicationIdHeader: "Application ID",
    columns: [
        {
            header: "Application ID",
            value: (payload) => payload.application.id,
        },
        {
            header: "Submitted At",
            value: (payload) => payload.submittedAt,
        },
        {
            header: "Applicant First Name",
            value: (payload) => asString(getApplicant(payload).firstName),
        },
        {
            header: "Applicant Last Name",
            value: (payload) => asString(getApplicant(payload).lastName),
        },
        {
            header: "Applicant Email",
            value: (payload) => asString(getApplicant(payload).email),
        },
        {
            header: "Applicant Phone",
            value: (payload) => asString(getApplicant(payload).phone),
        },
        {
            header: "Business Legal Name",
            value: (payload) => asString(getBusiness(payload).legalName),
        },
        {
            header: "Business Tax ID",
            value: (payload) => asString(getBusiness(payload).taxId),
        },
        {
            header: "Business Entity Type",
            value: (payload) => asString(getBusiness(payload).entityType),
        },
        {
            header: "Business Address Line 1",
            value: (payload) => asString(getBusinessAddress(payload).line1),
        },
        {
            header: "Business City",
            value: (payload) => asString(getBusinessAddress(payload).city),
        },
        {
            header: "Business State",
            value: (payload) => asString(getBusinessAddress(payload).state),
        },
        {
            header: "Business Postal Code",
            value: (payload) => asString(getBusinessAddress(payload).postalCode),
        },
        {
            header: "Business Country",
            value: (payload) => asString(getBusinessAddress(payload).country),
        },
        {
            header: "Requested Amount",
            value: (payload) => payload.application.requestedAmount ?? null,
        },
        {
            header: "Product Type",
            value: (payload) => payload.application.productType,
        },
        {
            header: "Requested Term",
            value: (payload) => asString(getFinancials(payload).term),
        },
        {
            header: "Annual Revenue",
            value: (payload) => asNumber((getFinancials(payload).annualRevenue ?? getFinancials(payload).annual)),
        },
        {
            header: "Monthly Revenue",
            value: (payload) => asNumber((getFinancials(payload).monthlyRevenue ?? getFinancials(payload).monthly)),
        },
        {
            header: "Banking Summary",
            value: (payload) => asString(getFinancials(payload).bankingSummary),
        },
    ],
};
