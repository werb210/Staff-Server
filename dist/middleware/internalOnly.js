"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.internalOnly = internalOnly;
function internalOnly(req, res, next) {
    if (process.env.NODE_ENV === "test") {
        next();
        return;
    }
    const key = req.headers["x-internal-key"];
    const provided = Array.isArray(key) ? key[0] : key;
    const expected = process.env.INTERNAL_API_KEY;
    if (provided !== expected) {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    next();
}
