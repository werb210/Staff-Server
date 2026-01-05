"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWithRequestContext = runWithRequestContext;
exports.getRequestId = getRequestId;
const async_hooks_1 = require("async_hooks");
const storage = new async_hooks_1.AsyncLocalStorage();
function runWithRequestContext(requestId, fn) {
    return storage.run({ requestId }, fn);
}
function getRequestId() {
    return storage.getStore()?.requestId;
}
