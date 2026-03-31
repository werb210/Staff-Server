"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ok = ok;
exports.fail = fail;
function ok(res, data = {}, message = "ok") {
    return res.json({ success: true, message, data });
}
function fail(res, status = 500, message = "error") {
    return res.status(status).json({ success: false, message });
}
