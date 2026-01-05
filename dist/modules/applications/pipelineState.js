"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGAL_TRANSITIONS = exports.PIPELINE_STATES = void 0;
exports.isPipelineState = isPipelineState;
exports.canTransition = canTransition;
exports.PIPELINE_STATES = [
    "NEW",
    "REQUIRES_DOCS",
    "UNDER_REVIEW",
    "LENDER_SUBMITTED",
    "APPROVED",
    "DECLINED",
    "FUNDED",
];
function isPipelineState(value) {
    return exports.PIPELINE_STATES.includes(value);
}
exports.LEGAL_TRANSITIONS = {
    NEW: ["REQUIRES_DOCS"],
    REQUIRES_DOCS: ["UNDER_REVIEW"],
    UNDER_REVIEW: ["LENDER_SUBMITTED", "REQUIRES_DOCS", "DECLINED"],
    LENDER_SUBMITTED: ["APPROVED", "DECLINED", "REQUIRES_DOCS"],
    APPROVED: ["FUNDED"],
    DECLINED: [],
    FUNDED: [],
};
function canTransition(current, next) {
    return (exports.LEGAL_TRANSITIONS[current] ?? []).includes(next);
}
