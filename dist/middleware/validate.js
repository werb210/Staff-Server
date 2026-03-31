"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = exports.validationErrorHandler = void 0;
exports.requireFields = requireFields;
function requireFields(fields) {
    return (req, res, next) => {
        for (const field of fields) {
            if (!req.body || req.body[field] === undefined) {
                return res.status(400).json({ error: "INVALID_INPUT" });
            }
        }
        next();
    };
}
const validationErrorHandler = (err, _req, res, next) => {
    if (err?.type === "validation") {
        return res.status(400).json({ error: "INVALID_INPUT" });
    }
    return next(err);
};
exports.validationErrorHandler = validationErrorHandler;
exports.validateBody = requireFields;
