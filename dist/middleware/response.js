"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.error = void 0;
exports.okResponse = okResponse;
exports.ok = okResponse;
exports.fail = fail;
const response_1 = require("../lib/response");
Object.defineProperty(exports, "error", { enumerable: true, get: function () { return response_1.error; } });
function ridFrom(res) {
    return res.locals.requestId ?? res.getHeader("x-request-id");
}
function okResponse(res, data, statusCode = 200) {
    res.locals.__wrapped = true;
    return res.status(statusCode).json((0, response_1.ok)(data, ridFrom(res)));
}
function fail(res, statusCode, message) {
    res.locals.__wrapped = true;
    return res.status(statusCode).json((0, response_1.error)(message, ridFrom(res)));
}
