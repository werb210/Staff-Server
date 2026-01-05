"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAPABILITIES = void 0;
exports.getCapabilitiesForRole = getCapabilitiesForRole;
const roles_1 = require("./roles");
exports.CAPABILITIES = {
    AUTH_SESSION: "auth:session",
    STAFF_OVERVIEW: "staff:overview",
    USER_MANAGE: "user:manage",
    APPLICATION_CREATE: "application:create",
    DOCUMENT_UPLOAD: "document:upload",
    DOCUMENT_REVIEW: "document:review",
    PIPELINE_MANAGE: "pipeline:manage",
    PIPELINE_OVERRIDE: "pipeline:override",
    LENDER_SUBMIT: "lender:submit",
    AUDIT_VIEW: "audit:view",
    ACCOUNT_UNLOCK: "account:unlock",
    REPORT_VIEW: "report:view",
    OPS_MANAGE: "ops:manage",
};
const roleCapabilities = {
    [roles_1.ROLES.ADMIN]: [
        exports.CAPABILITIES.AUTH_SESSION,
        exports.CAPABILITIES.USER_MANAGE,
        exports.CAPABILITIES.APPLICATION_CREATE,
        exports.CAPABILITIES.DOCUMENT_UPLOAD,
        exports.CAPABILITIES.DOCUMENT_REVIEW,
        exports.CAPABILITIES.PIPELINE_MANAGE,
        exports.CAPABILITIES.PIPELINE_OVERRIDE,
        exports.CAPABILITIES.LENDER_SUBMIT,
        exports.CAPABILITIES.AUDIT_VIEW,
        exports.CAPABILITIES.ACCOUNT_UNLOCK,
        exports.CAPABILITIES.REPORT_VIEW,
        exports.CAPABILITIES.OPS_MANAGE,
    ],
    [roles_1.ROLES.STAFF]: [
        exports.CAPABILITIES.AUTH_SESSION,
        exports.CAPABILITIES.STAFF_OVERVIEW,
        exports.CAPABILITIES.APPLICATION_CREATE,
        exports.CAPABILITIES.DOCUMENT_UPLOAD,
        exports.CAPABILITIES.DOCUMENT_REVIEW,
        exports.CAPABILITIES.PIPELINE_MANAGE,
        exports.CAPABILITIES.PIPELINE_OVERRIDE,
        exports.CAPABILITIES.LENDER_SUBMIT,
    ],
    [roles_1.ROLES.USER]: [
        exports.CAPABILITIES.AUTH_SESSION,
        exports.CAPABILITIES.APPLICATION_CREATE,
        exports.CAPABILITIES.DOCUMENT_UPLOAD,
    ],
};
function getCapabilitiesForRole(role) {
    return [...(roleCapabilities[role] ?? [])];
}
