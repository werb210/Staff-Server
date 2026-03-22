"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../middleware/auth.js");
const response_js_1 = require("../utils/response.js");
const toStringSafe_1 = require("../utils/toStringSafe");
const router = express_1.default.Router();
const db = {};
router.post("/upload", auth_js_1.requireAuth, (req, res) => {
    const id = Date.now().toString();
    const doc = {
        id,
        status: "uploaded",
        metadata: req.body
    };
    db[id] = doc;
    return res.json((0, response_js_1.ok)(doc));
});
router.patch("/:id/accept", auth_js_1.requireAuth, (req, res) => {
    const doc = db[(0, toStringSafe_1.toStringSafe)(req.params.id)];
    if (!doc)
        return res.status(404).json((0, response_js_1.fail)("Not found"));
    doc.status = "accepted";
    return res.json((0, response_js_1.ok)(doc));
});
router.patch("/:id/reject", auth_js_1.requireAuth, (req, res) => {
    const doc = db[(0, toStringSafe_1.toStringSafe)(req.params.id)];
    if (!doc)
        return res.status(404).json((0, response_js_1.fail)("Not found"));
    doc.status = "rejected";
    return res.json((0, response_js_1.ok)(doc));
});
exports.default = router;
