"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const response_js_1 = require("../../utils/response.js");
const router = express_1.default.Router();
const store = {};
router.post("/start", (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json((0, response_js_1.fail)("phone required"));
    }
    const code = "123456";
    store[phone] = {
        code,
        expires: Date.now() + 5 * 60 * 1000
    };
    return res.json((0, response_js_1.ok)({ sent: true }));
});
router.post("/verify", (req, res) => {
    const { phone, code } = req.body;
    const entry = store[phone];
    if (!entry || entry.code !== code) {
        return res.status(400).json((0, response_js_1.fail)("invalid code"));
    }
    return res.json((0, response_js_1.ok)({
        token: "mock-jwt-token",
        nextPath: "/dashboard"
    }));
});
exports.default = router;
