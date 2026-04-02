"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ok = ok;
exports.error = error;
function ok(data, rid) {
    return { status: "ok", ...(rid ? { rid } : {}), ...(data !== undefined ? { data } : {}) };
}
function error(message, rid) {
    return { status: "error", ...(rid ? { rid } : {}), error: message };
}
