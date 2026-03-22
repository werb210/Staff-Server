"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retry = retry;
exports.withRetry = withRetry;
async function retry(fn, retries = 3) {
    try {
        return await fn();
    }
    catch (err) {
        if (retries <= 0) {
            throw err;
        }
        return retry(fn, retries - 1);
    }
}
async function withRetry(fn, attempts = 3) {
    return retry(fn, attempts - 1);
}
