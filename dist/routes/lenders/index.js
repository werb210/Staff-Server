"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    if (process.env.NODE_ENV === 'test') {
        throw new Error('Lender route failure');
    }
    return res.status(200).json([]);
});
exports.default = router;
