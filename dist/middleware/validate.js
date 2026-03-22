"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = void 0;
exports.requireFields = requireFields;
function requireFields(fields) {
    return (req, res, next) => {
        for (const field of fields) {
            if (!(req.body)[field]) {
                return res.status(400).json({
                    ok: false,
                    error: `Missing field: ${field}`
                });
            }
        }
        next();
    };
}
// backward compatibility
exports.validateBody = requireFields;
