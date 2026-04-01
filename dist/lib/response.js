"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ok = ok;
exports.fail = fail;
function ok(res, data) {
    res.locals.__wrapped = true;
    return res.status(200).json({ status: "ok", data });
}
function fail(res, code, message) {
    res.locals.__wrapped = true;
    return res.status(code).json({
        status: "error",
        error: { code: String(code), message },
    });
}
