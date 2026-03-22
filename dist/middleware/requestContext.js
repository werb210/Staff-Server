"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestContext = requestContext;
exports.getRequestId = getRequestId;
exports.getRequestRoute = getRequestRoute;
exports.getRequestIdempotencyKeyHash = getRequestIdempotencyKeyHash;
exports.runWithRequestContext = runWithRequestContext;
exports.addRequestDbProcessId = addRequestDbProcessId;
exports.removeRequestDbProcessId = removeRequestDbProcessId;
exports.getRequestDbProcessIds = getRequestDbProcessIds;
exports.setRequestIdempotencyKeyHash = setRequestIdempotencyKeyHash;
const crypto_1 = require("crypto");
const requestContext_1 = require("../observability/requestContext");
function requestContext(req, res, next) {
    const incoming = req.headers["x-request-id"];
    const requestId = String(Array.isArray(incoming) ? incoming[0] : incoming ?? (0, crypto_1.randomUUID)());
    req.id = requestId;
    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    (0, requestContext_1.runWithRequestContext)(req, res, next);
}
function getRequestId() {
    return (0, requestContext_1.getRequestContext)()?.requestId;
}
function getRequestRoute() {
    return (0, requestContext_1.getRequestContext)()?.path;
}
function getRequestIdempotencyKeyHash() {
    return (0, requestContext_1.getRequestContext)()?.idempotencyKeyHash;
}
function runWithRequestContext(ctx, fn) {
    const input = {
        requestId: ctx.requestId,
        ...(ctx.method !== undefined ? { method: ctx.method } : {}),
        ...(ctx.path !== undefined || ctx.route !== undefined ? { path: ctx.path ?? ctx.route } : {}),
        ...(ctx.startTime !== undefined || ctx.start !== undefined
            ? { startTime: ctx.startTime ?? ctx.start }
            : {}),
        ...(ctx.sqlTraceEnabled !== undefined ? { sqlTraceEnabled: ctx.sqlTraceEnabled } : {}),
        ...(ctx.dbProcessIds !== undefined ? { dbProcessIds: ctx.dbProcessIds } : {}),
        ...(ctx.idempotencyKeyHash !== undefined ? { idempotencyKeyHash: ctx.idempotencyKeyHash } : {}),
    };
    return (0, requestContext_1.withRequestContext)(input, fn);
}
function addRequestDbProcessId(processId) {
    const store = (0, requestContext_1.getRequestContext)();
    if (!store)
        return;
    if (!store.dbProcessIds) {
        store.dbProcessIds = new Set();
    }
    store.dbProcessIds.add(processId);
}
function removeRequestDbProcessId(processId) {
    const store = (0, requestContext_1.getRequestContext)();
    if (!store)
        return;
    store.dbProcessIds?.delete(processId);
}
function getRequestDbProcessIds() {
    const store = (0, requestContext_1.getRequestContext)();
    return store?.dbProcessIds ? Array.from(store.dbProcessIds) : [];
}
function setRequestIdempotencyKeyHash(value) {
    const store = (0, requestContext_1.getRequestContext)();
    if (!store)
        return;
    store.idempotencyKeyHash = value;
}
