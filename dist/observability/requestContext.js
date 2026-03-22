"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequestContext = getRequestContext;
exports.runWithRequestContext = runWithRequestContext;
exports.withRequestContext = withRequestContext;
const async_hooks_1 = require("async_hooks");
const crypto_1 = require("crypto");
const storage = new async_hooks_1.AsyncLocalStorage();
const isSqlTracePath = (path) => path.startsWith("/api/lenders") || path.startsWith("/api/lender-products");
const resolveRequestId = (req) => {
    if (typeof req.id === "string" && req.id.trim().length > 0) {
        return req.id;
    }
    const headerValue = req.get("x-request-id");
    const trimmed = headerValue ? headerValue.trim() : "";
    return trimmed.length > 0 ? trimmed : (0, crypto_1.randomUUID)();
};
const buildStore = (input) => {
    const path = input.path ?? "unknown";
    const store = {
        requestId: input.requestId,
        method: input.method ?? "UNKNOWN",
        path,
        startTime: input.startTime ?? Date.now(),
        sqlTraceEnabled: input.sqlTraceEnabled ?? isSqlTracePath(path),
        dbProcessIds: input.dbProcessIds ?? new Set(),
    };
    if (input.idempotencyKeyHash !== undefined) {
        store.idempotencyKeyHash = input.idempotencyKeyHash;
    }
    return store;
};
function getRequestContext() {
    return storage.getStore();
}
function runWithRequestContext(req, res, next) {
    const requestId = resolveRequestId(req);
    const store = buildStore({
        requestId,
        method: req.method,
        path: req.path,
        startTime: Date.now(),
    });
    storage.run(store, () => {
        res.locals.requestId = requestId;
        res.locals.requestStart = store.startTime;
        res.locals.requestPath = store.path;
        res.setHeader("X-Request-Id", requestId);
        next();
    });
}
function withRequestContext(ctx, fn) {
    const previous = storage.getStore();
    const store = buildStore(ctx);
    const restore = () => {
        if (previous) {
            storage.enterWith(previous);
        }
    };
    const result = storage.run(store, fn);
    if (result instanceof Promise) {
        return result.finally(restore);
    }
    restore();
    return result;
}
