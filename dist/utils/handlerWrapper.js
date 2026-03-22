"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrap = void 0;
const wrap = (fn) => {
    return async (req, res, next) => {
        try {
            await fn(req, res, next);
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ success: false, error: "Internal error" });
        }
    };
};
exports.wrap = wrap;
